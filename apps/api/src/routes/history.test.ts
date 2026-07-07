import { env } from 'cloudflare:test'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { signSession } from '../auth'
import app from '../index'

async function seedBook(
  overrides: Partial<{
    isbn: string
    location: string
    title: string
    total: number
  }> = {},
) {
  const book = {
    isbn: '9784003101018',
    location: 'daikanyama',
    title: 'サンプル本',
    total: 1,
    ...overrides,
  }
  const res = await env.DB.prepare(
    `INSERT INTO books (isbn, location, title, total) VALUES (?,?,?,?)`,
  )
    .bind(book.isbn, book.location, book.title, book.total)
    .run()
  return { ...book, id: res.meta.last_row_id }
}

async function sessionCookie(email = 'user@example.com', name = 'Tester') {
  const token = await signSession(env.AUTH_COOKIE_SECRET, { email, name, hd: 'example.com' }, 3600)
  return `bookbook_session=${token}`
}

async function availableCountOf(isbn: string) {
  const book = await env.DB.prepare(
    `SELECT total - (SELECT COUNT(*) FROM histories h WHERE h.book_id = books.id AND h.return_date IS NULL) AS available_count
     FROM books WHERE isbn = ?`,
  )
    .bind(isbn)
    .first<{ available_count: number }>()
  return book?.available_count
}

beforeEach(async () => {
  vi.restoreAllMocks()
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('ok', { status: 200 })))
  await env.DB.exec('DELETE FROM histories')
  await env.DB.exec('DELETE FROM books')
})

describe('POST /api/history（貸出）', () => {
  it('未返却の履歴を1件追加し在庫が1減る', async () => {
    await seedBook({ total: 2 })
    const cookie = await sessionCookie()

    const res = await app.fetch(
      new Request('http://localhost/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({ isbn: '9784003101018', location: 'daikanyama' }),
      }),
      env,
    )
    expect(res.status).toBe(201)
    const body = (await res.json()) as { borrowerEmail: string; isDone: boolean }
    expect(body.borrowerEmail).toBe('user@example.com')
    expect(body.isDone).toBe(false)

    expect(await availableCountOf('9784003101018')).toBe(1)

    const { results } = await env.DB.prepare('SELECT * FROM histories').all()
    expect(results).toHaveLength(1)
  })

  it('在庫0のときは409で履歴も追加されない', async () => {
    const book = await seedBook({ total: 1 })
    await env.DB.prepare(
      `INSERT INTO histories (book_id, borrower_email) VALUES (?, 'other@example.com')`,
    )
      .bind(book.id)
      .run()
    const cookie = await sessionCookie()

    const res = await app.fetch(
      new Request('http://localhost/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({ isbn: '9784003101018', location: 'daikanyama' }),
      }),
      env,
    )
    expect(res.status).toBe(409)

    const { results } = await env.DB.prepare('SELECT * FROM histories').all()
    expect(results).toHaveLength(1)
  })

  it('未登録の書籍は404', async () => {
    const cookie = await sessionCookie()
    const res = await app.fetch(
      new Request('http://localhost/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({ isbn: '0000000000000', location: 'daikanyama' }),
      }),
      env,
    )
    expect(res.status).toBe(404)
  })

  it('在庫1に対して別ユーザー2人が連続貸出すると2人目は409になる（在庫は負にならない）', async () => {
    await seedBook({ total: 1 })

    const cookieA = await sessionCookie('a@example.com')
    const cookieB = await sessionCookie('b@example.com')
    const [first, second] = await Promise.all([
      app.fetch(
        new Request('http://localhost/api/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Cookie: cookieA },
          body: JSON.stringify({ isbn: '9784003101018', location: 'daikanyama' }),
        }),
        env,
      ),
      app.fetch(
        new Request('http://localhost/api/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Cookie: cookieB },
          body: JSON.stringify({ isbn: '9784003101018', location: 'daikanyama' }),
        }),
        env,
      ),
    ])
    const statuses = [first.status, second.status].sort()
    expect(statuses).toEqual([201, 409])

    expect(await availableCountOf('9784003101018')).toBe(0)

    const { results } = await env.DB.prepare('SELECT * FROM histories').all()
    expect(results).toHaveLength(1)
  })

  it('同一ユーザーが同じ本を2回貸出すると2回目は409 already borrowed（在庫があっても）', async () => {
    await seedBook({ total: 2 })
    const cookie = await sessionCookie('user@example.com')

    const first = await app.fetch(
      new Request('http://localhost/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({ isbn: '9784003101018', location: 'daikanyama' }),
      }),
      env,
    )
    expect(first.status).toBe(201)

    const second = await app.fetch(
      new Request('http://localhost/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({ isbn: '9784003101018', location: 'daikanyama' }),
      }),
      env,
    )
    expect(second.status).toBe(409)
    const body = (await second.json()) as { error: string }
    expect(body.error).toBe('already borrowed')

    const { results } = await env.DB.prepare('SELECT * FROM histories').all()
    expect(results).toHaveLength(1)
  })
})

describe('GET /api/history', () => {
  it('ログインユーザーの履歴のみ返す', async () => {
    const book = await seedBook({ total: 1 })
    await env.DB.prepare(
      `INSERT INTO histories (book_id, borrower_email, borrower_name) VALUES (?,?,?)`,
    )
      .bind(book.id, 'user@example.com', 'Tester')
      .run()
    await env.DB.prepare(
      `INSERT INTO histories (book_id, borrower_email, borrower_name) VALUES (?,?,?)`,
    )
      .bind(book.id, 'other@example.com', 'Other')
      .run()

    const cookie = await sessionCookie()
    const res = await app.fetch(
      new Request('http://localhost/api/history?location=daikanyama', {
        headers: { Cookie: cookie },
      }),
      env,
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as Array<{ borrowerEmail: string }>
    expect(body).toHaveLength(1)
    expect(body[0].borrowerEmail).toBe('user@example.com')
  })

  it('isDone=false で未返却のみ絞り込める', async () => {
    const book = await seedBook({ total: 2 })
    await env.DB.prepare(
      `INSERT INTO histories (book_id, borrower_email) VALUES (?, 'user@example.com')`,
    )
      .bind(book.id)
      .run()
    await env.DB.prepare(
      `INSERT INTO histories (book_id, borrower_email, return_date) VALUES (?, 'user@example.com', '2026-01-01T00:00:00.000Z')`,
    )
      .bind(book.id)
      .run()

    const cookie = await sessionCookie()
    const res = await app.fetch(
      new Request('http://localhost/api/history?location=daikanyama&isDone=false', {
        headers: { Cookie: cookie },
      }),
      env,
    )
    const body = (await res.json()) as Array<{ isDone: boolean }>
    expect(body).toHaveLength(1)
    expect(body[0].isDone).toBe(false)
  })
})

describe('PATCH /api/history/:id（返却）', () => {
  async function seedHistory(borrowerEmail = 'user@example.com') {
    const book = await seedBook({ total: 2 })
    const res = await env.DB.prepare(
      `INSERT INTO histories (book_id, borrower_email, borrower_name) VALUES (?,?,?)`,
    )
      .bind(book.id, borrowerEmail, 'Tester')
      .run()
    return { book, historyId: res.meta.last_row_id }
  }

  it('返却すると在庫が戻り returnDate が入る', async () => {
    const { historyId } = await seedHistory()
    const cookie = await sessionCookie()

    const res = await app.fetch(
      new Request(`http://localhost/api/history/${historyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({ location: 'daikanyama' }),
      }),
      env,
    )
    expect(res.status).toBe(200)

    expect(await availableCountOf('9784003101018')).toBe(2)

    const history = await env.DB.prepare('SELECT return_date FROM histories WHERE id=?')
      .bind(historyId)
      .first<{ return_date: string | null }>()
    expect(history?.return_date).not.toBeNull()
  })

  it('他人の履歴は403で更新されない', async () => {
    const { historyId } = await seedHistory('other@example.com')
    const cookie = await sessionCookie('user@example.com')

    const res = await app.fetch(
      new Request(`http://localhost/api/history/${historyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({ location: 'daikanyama' }),
      }),
      env,
    )
    expect(res.status).toBe(403)

    const history = await env.DB.prepare('SELECT return_date FROM histories WHERE id=?')
      .bind(historyId)
      .first<{ return_date: string | null }>()
    expect(history?.return_date).toBeNull()
  })

  it('返却済みの履歴を再度返却すると409', async () => {
    const { historyId } = await seedHistory()
    const cookie = await sessionCookie()

    await app.fetch(
      new Request(`http://localhost/api/history/${historyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({ location: 'daikanyama' }),
      }),
      env,
    )

    const res = await app.fetch(
      new Request(`http://localhost/api/history/${historyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({ location: 'daikanyama' }),
      }),
      env,
    )
    expect(res.status).toBe(409)
  })

  it('存在しない履歴は404', async () => {
    const cookie = await sessionCookie()
    const res = await app.fetch(
      new Request('http://localhost/api/history/999999', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({ location: 'daikanyama' }),
      }),
      env,
    )
    expect(res.status).toBe(404)
  })
})
