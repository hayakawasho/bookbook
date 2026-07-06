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
    availableCount: number
  }> = {},
) {
  const book = {
    isbn: '9784003101018',
    location: 'daikanyama',
    title: 'サンプル本',
    total: 1,
    availableCount: 1,
    ...overrides,
  }
  const res = await env.DB.prepare(
    `INSERT INTO books (isbn, location, title, total, available_count) VALUES (?,?,?,?,?)`,
  )
    .bind(book.isbn, book.location, book.title, book.total, book.availableCount)
    .run()
  return { ...book, id: res.meta.last_row_id }
}

async function sessionCookie(email = 'user@example.com', name = 'Tester') {
  const token = await signSession(env.AUTH_COOKIE_SECRET, { email, name, hd: 'example.com' }, 3600)
  return `bookbook_session=${token}`
}

beforeEach(async () => {
  vi.restoreAllMocks()
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('ok', { status: 200 })))
  await env.DB.exec('DELETE FROM histories')
  await env.DB.exec('DELETE FROM books')
})

describe('POST /api/history（貸出）', () => {
  it('在庫を1減らし履歴を1件追加する', async () => {
    await seedBook({ total: 2, availableCount: 2 })
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

    const book = await env.DB.prepare('SELECT available_count FROM books WHERE isbn=?')
      .bind('9784003101018')
      .first<{ available_count: number }>()
    expect(book?.available_count).toBe(1)

    const { results } = await env.DB.prepare('SELECT * FROM histories').all()
    expect(results).toHaveLength(1)
  })

  it('在庫0のときは409で履歴も追加されない', async () => {
    await seedBook({ total: 1, availableCount: 0 })
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
    expect(results).toHaveLength(0)
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

  it('在庫1に対して連続で2回貸出すると2回目は409になる（競合しても在庫は負にならない）', async () => {
    await seedBook({ total: 1, availableCount: 1 })
    const cookie = await sessionCookie()

    const request = () =>
      app.fetch(
        new Request('http://localhost/api/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Cookie: cookie },
          body: JSON.stringify({ isbn: '9784003101018', location: 'daikanyama' }),
        }),
        env,
      )

    const [first, second] = await Promise.all([request(), request()])
    const statuses = [first.status, second.status].sort()
    expect(statuses).toEqual([201, 409])

    const book = await env.DB.prepare('SELECT available_count FROM books WHERE isbn=?')
      .bind('9784003101018')
      .first<{ available_count: number }>()
    expect(book?.available_count).toBe(0)

    const { results } = await env.DB.prepare('SELECT * FROM histories').all()
    expect(results).toHaveLength(1)
  })
})

describe('GET /api/history', () => {
  it('ログインユーザーの履歴のみ返す', async () => {
    const book = await seedBook({ total: 1, availableCount: 0 })
    await env.DB.prepare(
      `INSERT INTO histories (book_id, isbn, location, borrower_email, borrower_name) VALUES (?,?,?,?,?)`,
    )
      .bind(book.id, book.isbn, book.location, 'user@example.com', 'Tester')
      .run()
    await env.DB.prepare(
      `INSERT INTO histories (book_id, isbn, location, borrower_email, borrower_name) VALUES (?,?,?,?,?)`,
    )
      .bind(book.id, book.isbn, book.location, 'other@example.com', 'Other')
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
})

describe('PATCH /api/history/:id（返却）', () => {
  async function seedHistory(borrowerEmail = 'user@example.com') {
    const book = await seedBook({ total: 2, availableCount: 1 })
    const res = await env.DB.prepare(
      `INSERT INTO histories (book_id, isbn, location, borrower_email, borrower_name) VALUES (?,?,?,?,?)`,
    )
      .bind(book.id, book.isbn, book.location, borrowerEmail, 'Tester')
      .run()
    return { book, historyId: res.meta.last_row_id }
  }

  it('返却すると在庫が戻り is_done になる', async () => {
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

    const book = await env.DB.prepare('SELECT available_count FROM books WHERE isbn=?')
      .bind('9784003101018')
      .first<{ available_count: number }>()
    expect(book?.available_count).toBe(2)

    const history = await env.DB.prepare('SELECT is_done FROM histories WHERE id=?')
      .bind(historyId)
      .first<{ is_done: number }>()
    expect(history?.is_done).toBe(1)
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

    const history = await env.DB.prepare('SELECT is_done FROM histories WHERE id=?')
      .bind(historyId)
      .first<{ is_done: number }>()
    expect(history?.is_done).toBe(0)
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
