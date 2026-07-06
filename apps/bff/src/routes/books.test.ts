import { env } from 'cloudflare:test'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { signSession } from '../auth'
import app from '../index'

async function seedBook(
  overrides: Partial<{
    isbn: string
    location: string
    title: string
    author: string | null
    publisher: string | null
    total: number
    availableCount: number
    coverSrc: string | null
  }> = {},
) {
  const book = {
    isbn: '9784000000000',
    location: 'daikanyama',
    title: 'サンプル本',
    author: null,
    publisher: null,
    total: 1,
    availableCount: 1,
    coverSrc: null,
    ...overrides,
  }
  await env.DB.prepare(
    `INSERT INTO books (isbn, location, title, author, publisher, cover_src, total, available_count) VALUES (?,?,?,?,?,?,?,?)`,
  )
    .bind(
      book.isbn,
      book.location,
      book.title,
      book.author,
      book.publisher,
      book.coverSrc,
      book.total,
      book.availableCount,
    )
    .run()
  return book
}

async function sessionCookie(email = 'user@example.com', name = 'Tester') {
  const token = await signSession(env.AUTH_COOKIE_SECRET, { email, name, hd: 'example.com' }, 3600)
  return `bookbook_session=${token}`
}

beforeEach(async () => {
  vi.restoreAllMocks()
  await env.DB.exec('DELETE FROM histories')
  await env.DB.exec('DELETE FROM books')
})

describe('GET /api/books', () => {
  it('location 必須で 400', async () => {
    const cookie = await sessionCookie()
    const res = await app.fetch(
      new Request('http://localhost/api/books', { headers: { Cookie: cookie } }),
      env,
    )
    expect(res.status).toBe(400)
  })

  it('未知の location は 400', async () => {
    const cookie = await sessionCookie()
    const res = await app.fetch(
      new Request('http://localhost/api/books?location=unknown', { headers: { Cookie: cookie } }),
      env,
    )
    expect(res.status).toBe(400)
  })

  it('location で絞り込んだ書籍一覧を返す', async () => {
    await seedBook({ isbn: '111', title: 'Readable Code' })
    await seedBook({ isbn: '222', title: '沖縄の本', location: 'okinawa' })
    const cookie = await sessionCookie()

    const res = await app.fetch(
      new Request('http://localhost/api/books?location=daikanyama', {
        headers: { Cookie: cookie },
      }),
      env,
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as Array<{ isbn: string; title: string }>
    expect(body).toHaveLength(1)
    expect(body[0].title).toBe('Readable Code')
  })

  it('q でタイトル部分一致検索する', async () => {
    await seedBook({ isbn: '111', title: 'Readable Code' })
    await seedBook({ isbn: '222', title: 'Clean Architecture' })
    const cookie = await sessionCookie()

    const res = await app.fetch(
      new Request('http://localhost/api/books?location=daikanyama&q=Readable', {
        headers: { Cookie: cookie },
      }),
      env,
    )
    const body = (await res.json()) as Array<{ title: string }>
    expect(body).toHaveLength(1)
    expect(body[0].title).toBe('Readable Code')
  })
})

describe('GET /api/books/:isbn', () => {
  it('登録済みなら registered を返す', async () => {
    await seedBook({ isbn: '9784003101018', title: '登録済み本' })
    const cookie = await sessionCookie()

    const res = await app.fetch(
      new Request('http://localhost/api/books/9784003101018?location=daikanyama', {
        headers: { Cookie: cookie },
      }),
      env,
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { status: string; book: { title: string } }
    expect(body.status).toBe('registered')
    expect(body.book.title).toBe('登録済み本')
  })

  it('未登録は外部 API から external を返す', async () => {
    const cookie = await sessionCookie()
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('googleapis.com/books')) {
          return new Response(
            JSON.stringify({
              totalItems: 1,
              items: [{ volumeInfo: { title: 'リーダブルコード', authors: ['Dustin Boswell'] } }],
            }),
            { status: 200 },
          )
        }
        if (url.includes('api.openbd.jp')) {
          return new Response(JSON.stringify([null]), { status: 200 })
        }
        return new Response('', { status: 404 })
      }),
    )

    const res = await app.fetch(
      new Request('http://localhost/api/books/9784873119038?location=daikanyama', {
        headers: { Cookie: cookie },
      }),
      env,
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { status: string }
    expect(body.status).toBe('external')
  })

  it('外部にも無ければ notfound 404', async () => {
    const cookie = await sessionCookie()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 404 })))

    const res = await app.fetch(
      new Request('http://localhost/api/books/0000000000000?location=daikanyama', {
        headers: { Cookie: cookie },
      }),
      env,
    )
    expect(res.status).toBe(404)
    const body = (await res.json()) as { status: string }
    expect(body.status).toBe('notfound')
  })
})

describe('POST /api/books', () => {
  it('セッション Cookie なしは 401', async () => {
    const res = await app.fetch(
      new Request('http://localhost/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isbn: '1', title: 't', location: 'daikanyama' }),
      }),
      env,
    )
    expect(res.status).toBe(401)
  })

  it('新規書籍を登録すると 201', async () => {
    const cookie = await sessionCookie()
    const res = await app.fetch(
      new Request('http://localhost/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({
          isbn: '1234567890123',
          title: 'テスト本',
          cover: { src: 'https://example.com/cover.jpg' },
          location: 'daikanyama',
        }),
      }),
      env,
    )
    expect(res.status).toBe(201)

    const row = await env.DB.prepare('SELECT * FROM books WHERE isbn = ?')
      .bind('1234567890123')
      .first<{ title: string; total: number; available_count: number; cover_src: string }>()
    expect(row?.title).toBe('テスト本')
    expect(row?.total).toBe(1)
    expect(row?.available_count).toBe(1)
    expect(row?.cover_src).toBe('https://example.com/cover.jpg')
  })

  it('同じ isbn/location は重複登録されない', async () => {
    await seedBook({ isbn: '1234567890123' })
    const cookie = await sessionCookie()
    const res = await app.fetch(
      new Request('http://localhost/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({
          isbn: '1234567890123',
          title: '重複本',
          location: 'daikanyama',
        }),
      }),
      env,
    )
    expect(res.status).toBe(201)
    const { results } = await env.DB.prepare('SELECT * FROM books WHERE isbn = ?')
      .bind('1234567890123')
      .all()
    expect(results).toHaveLength(1)
  })

  it('未知の location は 400', async () => {
    const cookie = await sessionCookie()
    const res = await app.fetch(
      new Request('http://localhost/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({ isbn: '1', title: 't', location: 'unknown' }),
      }),
      env,
    )
    expect(res.status).toBe(400)
  })
})

describe('PATCH /api/books/:isbn/count', () => {
  it('妥当な貸出遷移は在庫を更新する', async () => {
    await seedBook({ isbn: '9784003101018', total: 3, availableCount: 2 })
    const cookie = await sessionCookie()

    const res = await app.fetch(
      new Request('http://localhost/api/books/9784003101018/count', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({ availableCount: 1, total: 3, location: 'daikanyama' }),
      }),
      env,
    )
    expect(res.status).toBe(200)
    const row = await env.DB.prepare('SELECT available_count FROM books WHERE isbn = ?')
      .bind('9784003101018')
      .first<{ available_count: number }>()
    expect(row?.available_count).toBe(1)
  })

  it('CAS 競合（他の更新が先行）は 409', async () => {
    await seedBook({ isbn: '9784003101018', total: 1, availableCount: 0 })
    const cookie = await sessionCookie()

    const res = await app.fetch(
      new Request('http://localhost/api/books/9784003101018/count', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({ availableCount: -1, total: 1, location: 'daikanyama' }),
      }),
      env,
    )
    expect(res.status).toBe(409)
  })

  it('存在しない ISBN は 404', async () => {
    const cookie = await sessionCookie()
    const res = await app.fetch(
      new Request('http://localhost/api/books/0000000000000/count', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({ availableCount: 1, total: 1, location: 'daikanyama' }),
      }),
      env,
    )
    expect(res.status).toBe(404)
  })
})

describe('PATCH /api/books/:isbn/metadata', () => {
  it('外部書誌でタイトルを更新する', async () => {
    await seedBook({ isbn: '9784873117317', title: '旧タイトル' })
    const cookie = await sessionCookie()

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('googleapis.com/books')) {
          return new Response(
            JSON.stringify({
              totalItems: 1,
              items: [
                { volumeInfo: { title: 'Clean Architecture', authors: ['Robert C. Martin'] } },
              ],
            }),
            { status: 200 },
          )
        }
        if (url.includes('api.openbd.jp')) {
          return new Response(JSON.stringify([null]), { status: 200 })
        }
        return new Response('', { status: 404 })
      }),
    )

    const res = await app.fetch(
      new Request('http://localhost/api/books/9784873117317/metadata', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({ location: 'daikanyama' }),
      }),
      env,
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { book: { title: string } }
    expect(body.book.title).toBe('Clean Architecture')
  })

  it('未登録の ISBN は 404', async () => {
    const cookie = await sessionCookie()
    const res = await app.fetch(
      new Request('http://localhost/api/books/0000000000000/metadata', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({ location: 'daikanyama' }),
      }),
      env,
    )
    expect(res.status).toBe(404)
  })
})
