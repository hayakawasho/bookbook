import { createExecutionContext, env, waitOnExecutionContext } from 'cloudflare:test'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { signSession } from '../auth'
import app from '../index'
import { selfThumbnailSrc, thumbnailKey } from '../thumbnails'

/** waitUntil で非同期処理を行うルートは、実行完了を待ってから assert する */
async function fetchWithExecutionContext(request: Request) {
  const ctx = createExecutionContext()
  const res = await app.fetch(request, env, ctx)
  await waitOnExecutionContext(ctx)
  return res
}

function bytes(length: number, fill = 1): Uint8Array {
  return new Uint8Array(length).fill(fill)
}

async function seedBook(
  overrides: Partial<{
    isbn: string
    location: string
    title: string
    author: string | null
    publisher: string | null
    total: number
    coverSrc: string | null
    deletedAt: string | null
  }> = {},
) {
  const book = {
    isbn: '9784000000000',
    location: 'daikanyama',
    title: 'サンプル本',
    author: null,
    publisher: null,
    total: 1,
    coverSrc: null,
    deletedAt: null,
    ...overrides,
  }
  const res = await env.DB.prepare(
    `INSERT INTO books (isbn, location, title, author, publisher, cover_src, total, deleted_at) VALUES (?,?,?,?,?,?,?,?)`,
  )
    .bind(
      book.isbn,
      book.location,
      book.title,
      book.author,
      book.publisher,
      book.coverSrc,
      book.total,
      book.deletedAt,
    )
    .run()
  return { ...book, id: res.meta.last_row_id }
}

async function sessionCookie(email = 'user@example.com', name = 'Tester') {
  const token = await signSession(env.AUTH_COOKIE_SECRET, { email, name, hd: 'example.com' }, 3600)
  return `bookbook_session=${token}`
}

beforeEach(async () => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  await env.DB.exec('DELETE FROM histories')
  await env.DB.exec('DELETE FROM books')
  const list = await env.THUMBNAILS.list()
  await Promise.all(list.objects.map((obj) => env.THUMBNAILS.delete(obj.key)))
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

  it('在庫数(availableCount)は total から未返却の貸出数を引いた値になる', async () => {
    const book = await seedBook({ isbn: '111', total: 3 })
    await env.DB.prepare(
      `INSERT INTO histories (book_id, borrower_email) VALUES (?, 'a@example.com')`,
    )
      .bind(book.id)
      .run()
    const cookie = await sessionCookie()

    const res = await app.fetch(
      new Request('http://localhost/api/books?location=daikanyama', {
        headers: { Cookie: cookie },
      }),
      env,
    )
    const body = (await res.json()) as Array<{ availableCount: number; total: number }>
    expect(body[0]).toMatchObject({ availableCount: 2, total: 3 })
  })

  it('論理削除された本は一覧に出ない', async () => {
    await seedBook({ isbn: '111', title: '削除済み', deletedAt: '2026-01-01T00:00:00.000Z' })
    const cookie = await sessionCookie()

    const res = await app.fetch(
      new Request('http://localhost/api/books?location=daikanyama', {
        headers: { Cookie: cookie },
      }),
      env,
    )
    const body = (await res.json()) as Array<{ isbn: string }>
    expect(body).toHaveLength(0)
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

  it('楽天認証情報を外部 API に渡して書影を返す', async () => {
    const cookie = await sessionCookie()
    const rakutenSrc = 'https://thumbnail.image.rakuten.co.jp/@0_mall/example/cabinet/cover.jpg'
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.includes('googleapis.com/books')) {
        return new Response(JSON.stringify({ totalItems: 0 }), { status: 200 })
      }
      if (url.includes('api.openbd.jp')) {
        return new Response(
          JSON.stringify([
            {
              onix: { DescriptiveDetail: {}, CollateralDetail: {} },
              summary: { title: '楽天カバー本' },
            },
          ]),
          { status: 200 },
        )
      }
      if (url.includes('openapi.rakuten.co.jp')) {
        const headers = new Headers(init?.headers)
        expect(headers.get('accessKey')).toBe('test-access-key')
        expect(headers.get('Referer')).toBe('https://bookbook-worker.example.com/')
        expect(headers.get('Origin')).toBe('https://bookbook-worker.example.com')
        return new Response(JSON.stringify({ Items: [{ Item: { largeImageUrl: rakutenSrc } }] }), {
          status: 200,
        })
      }
      if (url === rakutenSrc) {
        return new Response(bytes(600), {
          status: 200,
          headers: { 'Content-Type': 'image/jpeg' },
        })
      }
      return new Response('', { status: 404 })
    })
    vi.stubGlobal('fetch', fetchMock)

    const res = await app.fetch(
      new Request('http://localhost/api/books/9784000000201?location=daikanyama', {
        headers: { Cookie: cookie },
      }),
      {
        ...env,
        RAKUTEN_APP_ID: 'test-app-id',
        RAKUTEN_ACCESS_KEY: 'test-access-key',
        RAKUTEN_SITE_URL: 'https://bookbook-worker.example.com',
      },
    )

    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      status: string
      book: { cover: { src?: string } }
    }
    expect(body.status).toBe('external')
    expect(body.book.cover.src).toBe(rakutenSrc)
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
    // 表紙の取り込みは waitUntil の非同期処理なので、外部 fetch 失敗にして同期的な INSERT だけを見る
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 404 })))

    const res = await fetchWithExecutionContext(
      new Request('http://localhost/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({
          isbn: '1234567890123',
          title: 'テスト本',
          cover: { src: 'https://cover.openbd.jp/cover.jpg' },
          location: 'daikanyama',
        }),
      }),
    )
    expect(res.status).toBe(201)

    const row = await env.DB.prepare('SELECT * FROM books WHERE isbn = ?')
      .bind('1234567890123')
      .first<{ title: string; total: number; cover_src: string }>()
    expect(row?.title).toBe('テスト本')
    expect(row?.total).toBe(1)
    expect(row?.cover_src).toBe('https://cover.openbd.jp/cover.jpg')
  })

  it('publishedDate と pageCount が保存され GET で返る', async () => {
    const cookie = await sessionCookie()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 404 })))

    const res = await fetchWithExecutionContext(
      new Request('http://localhost/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({
          isbn: '1234567890123',
          title: 'テスト本',
          publishedDate: '2024-05-01T00:00:00.000Z',
          pageCount: 320,
          cover: {},
          location: 'daikanyama',
        }),
      }),
    )
    expect(res.status).toBe(201)

    const row = await env.DB.prepare('SELECT * FROM books WHERE isbn = ?')
      .bind('1234567890123')
      .first<{ published_date: string | null; page_count: number | null }>()
    expect(row?.published_date).toBe('2024-05-01T00:00:00.000Z')
    expect(row?.page_count).toBe(320)

    const getRes = await app.fetch(
      new Request('http://localhost/api/books/1234567890123?location=daikanyama', {
        headers: { Cookie: cookie },
      }),
      env,
    )
    expect(getRes.status).toBe(200)
    const json = (await getRes.json()) as {
      status: string
      book: { publishedDate?: string; pageCount?: number }
    }
    expect(json.status).toBe('registered')
    expect(json.book.publishedDate).toBe('2024-05-01T00:00:00.000Z')
    expect(json.book.pageCount).toBe(320)
  })

  it('pageCount が正の整数でなければ 400', async () => {
    const cookie = await sessionCookie()
    for (const pageCount of [0, -1, 1.5, '320']) {
      const res = await app.fetch(
        new Request('http://localhost/api/books', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Cookie: cookie },
          body: JSON.stringify({
            isbn: '1234567890123',
            title: 'テスト本',
            pageCount,
            location: 'daikanyama',
          }),
        }),
        env,
      )
      expect(res.status).toBe(400)
    }
  })

  it('publishedDate が ISO 8601 文字列でなければ 400', async () => {
    const cookie = await sessionCookie()
    const invalidValues = [
      'not-a-date',
      123,
      0,
      false,
      null,
      '',
      '2024',
      '05/01/2024',
      '2024-05-01',
      // 存在しない日付（Date.parse は 3/2 に正規化して通してしまう）
      '2024-02-31T00:00:00.000Z',
    ]
    for (const publishedDate of invalidValues) {
      const res = await app.fetch(
        new Request('http://localhost/api/books', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Cookie: cookie },
          body: JSON.stringify({
            isbn: '1234567890123',
            title: 'テスト本',
            publishedDate,
            location: 'daikanyama',
          }),
        }),
        env,
      )
      expect(res.status).toBe(400)
    }
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

  it('外部URLがR2に取り込まれるとcover_srcがselfURLに更新される', async () => {
    const cookie = await sessionCookie()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(bytes(600), {
          status: 200,
          headers: { 'Content-Type': 'image/jpeg' },
        }),
      ),
    )

    const res = await fetchWithExecutionContext(
      new Request('http://localhost/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({
          isbn: '9784000000001',
          title: '表紙あり本',
          cover: { src: 'https://cover.openbd.jp/cover-ok.jpg' },
          location: 'daikanyama',
        }),
      }),
    )
    expect(res.status).toBe(201)

    const row = await env.DB.prepare('SELECT cover_src FROM books WHERE isbn = ?')
      .bind('9784000000001')
      .first<{ cover_src: string }>()
    expect(row?.cover_src).toBe(selfThumbnailSrc('9784000000001'))
    const stored = await env.THUMBNAILS.get(thumbnailKey('9784000000001'))
    expect(stored).not.toBeNull()
  })

  it('外部fetchが失敗したらcover_srcは外部URLのまま', async () => {
    const cookie = await sessionCookie()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 404 })))

    const res = await fetchWithExecutionContext(
      new Request('http://localhost/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({
          isbn: '9784000000002',
          title: '表紙取得失敗本',
          cover: { src: 'https://cover.openbd.jp/broken.jpg' },
          location: 'daikanyama',
        }),
      }),
    )
    expect(res.status).toBe(201)

    const row = await env.DB.prepare('SELECT cover_src FROM books WHERE isbn = ?')
      .bind('9784000000002')
      .first<{ cover_src: string }>()
    expect(row?.cover_src).toBe('https://cover.openbd.jp/broken.jpg')
  })

  it('R2に既存の書影があれば外部fetchせず最初からselfURLで登録する', async () => {
    const isbn = '9784000000003'
    await env.THUMBNAILS.put(thumbnailKey(isbn), bytes(600), {
      httpMetadata: { contentType: 'image/jpeg' },
    })
    const cookie = await sessionCookie()
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const res = await fetchWithExecutionContext(
      new Request('http://localhost/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({
          isbn,
          title: '他拠点取り込み済み本',
          cover: { src: 'https://cover.openbd.jp/never-fetched.jpg' },
          location: 'okinawa',
        }),
      }),
    )
    expect(res.status).toBe(201)
    expect(fetchMock).not.toHaveBeenCalled()

    const row = await env.DB.prepare('SELECT cover_src FROM books WHERE isbn = ?')
      .bind(isbn)
      .first<{ cover_src: string }>()
    expect(row?.cover_src).toBe(selfThumbnailSrc(isbn))
  })

  it('coverなしの登録でもR2に書影があればselfURLで登録する', async () => {
    const isbn = '9784000000004'
    await env.THUMBNAILS.put(thumbnailKey(isbn), bytes(600), {
      httpMetadata: { contentType: 'image/jpeg' },
    })
    const cookie = await sessionCookie()

    const res = await fetchWithExecutionContext(
      new Request('http://localhost/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({
          isbn,
          title: '他拠点で撮影済み本',
          location: 'okinawa',
        }),
      }),
    )
    expect(res.status).toBe(201)

    const row = await env.DB.prepare('SELECT cover_src FROM books WHERE isbn = ?')
      .bind(isbn)
      .first<{ cover_src: string }>()
    expect(row?.cover_src).toBe(selfThumbnailSrc(isbn))
  })
})

describe('POST /api/books/:isbn/copies', () => {
  it('蔵書を1冊追加すると total が増える', async () => {
    await seedBook({ isbn: '9784003101018', total: 1 })
    const cookie = await sessionCookie()

    const res = await app.fetch(
      new Request('http://localhost/api/books/9784003101018/copies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({ location: 'daikanyama' }),
      }),
      env,
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { book: { total: number; availableCount: number } }
    expect(body.book.total).toBe(2)
    expect(body.book.availableCount).toBe(2)
  })

  it('存在しない ISBN は 404', async () => {
    const cookie = await sessionCookie()
    const res = await app.fetch(
      new Request('http://localhost/api/books/0000000000000/copies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({ location: 'daikanyama' }),
      }),
      env,
    )
    expect(res.status).toBe(404)
  })
})

describe('DELETE /api/books/:isbn（新規登録の取り消し）', () => {
  function deleteRequest(isbn: string, cookie: string, location = 'daikanyama') {
    return new Request(`http://localhost/api/books/${isbn}?location=${location}`, {
      method: 'DELETE',
      headers: { Cookie: cookie },
    })
  }

  it('登録直後の本を取り消すと books から消える', async () => {
    await seedBook({ isbn: '9784003101018', total: 1 })
    const cookie = await sessionCookie()

    const res = await fetchWithExecutionContext(deleteRequest('9784003101018', cookie))
    expect(res.status).toBe(200)

    const row = await env.DB.prepare('SELECT * FROM books WHERE isbn = ?')
      .bind('9784003101018')
      .first()
    expect(row).toBeNull()
  })

  it('取り消し後に同じ ISBN を再登録できる', async () => {
    await seedBook({ isbn: '9784003101018', total: 1 })
    const cookie = await sessionCookie()

    await fetchWithExecutionContext(deleteRequest('9784003101018', cookie))

    const res = await app.fetch(
      new Request('http://localhost/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({
          isbn: '9784003101018',
          title: 'サンプル本',
          location: 'daikanyama',
        }),
      }),
      env,
    )
    expect(res.status).toBe(201)
  })

  it('履歴のある本は取り消せず409', async () => {
    const book = await seedBook({ isbn: '9784003101018', total: 1 })
    await env.DB.prepare(
      `INSERT INTO histories (book_id, borrower_email, return_date) VALUES (?, 'user@example.com', '2026-07-01T00:00:00.000Z')`,
    )
      .bind(book.id)
      .run()
    const cookie = await sessionCookie()

    const res = await app.fetch(deleteRequest('9784003101018', cookie), env)
    expect(res.status).toBe(409)
  })

  it('冊数追加された本（total > 1）は取り消せず409', async () => {
    await seedBook({ isbn: '9784003101018', total: 2 })
    const cookie = await sessionCookie()

    const res = await app.fetch(deleteRequest('9784003101018', cookie), env)
    expect(res.status).toBe(409)
  })

  it('存在しない ISBN は 404', async () => {
    const cookie = await sessionCookie()
    const res = await app.fetch(deleteRequest('0000000000000', cookie), env)
    expect(res.status).toBe(404)
  })

  it('最後の1件を取り消すとR2の書影も削除される', async () => {
    const isbn = '9784003101019'
    await seedBook({ isbn, total: 1 })
    await env.THUMBNAILS.put(thumbnailKey(isbn), bytes(600), {
      httpMetadata: { contentType: 'image/jpeg' },
    })
    const cookie = await sessionCookie()

    const res = await fetchWithExecutionContext(deleteRequest(isbn, cookie))
    expect(res.status).toBe(200)

    expect(await env.THUMBNAILS.head(thumbnailKey(isbn))).toBeNull()
  })

  it('他 location に同じ ISBN が残っていればR2の書影は削除されない', async () => {
    const isbn = '9784003101020'
    await seedBook({ isbn, total: 1, location: 'daikanyama' })
    await seedBook({ isbn, total: 1, location: 'okinawa' })
    await env.THUMBNAILS.put(thumbnailKey(isbn), bytes(600), {
      httpMetadata: { contentType: 'image/jpeg' },
    })
    const cookie = await sessionCookie()

    const res = await fetchWithExecutionContext(deleteRequest(isbn, cookie, 'daikanyama'))
    expect(res.status).toBe(200)

    expect(await env.THUMBNAILS.head(thumbnailKey(isbn))).not.toBeNull()
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

  it('外部の書影URLをR2に取り込みselfURLで保存する', async () => {
    const isbn = '9784873117318'
    await seedBook({ isbn, title: '旧タイトル', coverSrc: null })
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
                {
                  volumeInfo: {
                    title: '新タイトル',
                    imageLinks: { thumbnail: 'https://books.google.com/refetched-cover.jpg' },
                  },
                },
              ],
            }),
            { status: 200 },
          )
        }
        if (url.includes('api.openbd.jp')) {
          // openBD は現在も書誌は返すが cover は常に空文字（実データで確認済み）
          return new Response(
            JSON.stringify([
              {
                onix: { DescriptiveDetail: {}, CollateralDetail: {} },
                summary: { title: '新タイトル', cover: '' },
              },
            ]),
            { status: 200 },
          )
        }
        if (url.startsWith('https://books.google.com/refetched-cover.jpg')) {
          return new Response(bytes(600), {
            status: 200,
            headers: { 'Content-Type': 'image/jpeg' },
          })
        }
        return new Response('', { status: 404 })
      }),
    )

    const res = await app.fetch(
      new Request(`http://localhost/api/books/${isbn}/metadata`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({ location: 'daikanyama' }),
      }),
      env,
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { book: { cover: { src?: string } } }
    expect(body.book.cover.src).toBe(selfThumbnailSrc(isbn))
    expect(await env.THUMBNAILS.head(thumbnailKey(isbn))).not.toBeNull()
  })

  it('既にselfURLの本は、外部に生きた書影があっても巻き戻らずR2も上書きされない', async () => {
    const isbn = '9784873117319'
    await seedBook({ isbn, title: '旧タイトル', coverSrc: selfThumbnailSrc(isbn) })
    // 撮影済みの自前画像を fill=9 で seed し、外部画像（fill=1）に置き換わらないことを中身で検証する
    await env.THUMBNAILS.put(thumbnailKey(isbn), bytes(600, 9), {
      httpMetadata: { contentType: 'image/jpeg' },
    })
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
                {
                  volumeInfo: {
                    title: '新タイトル',
                    imageLinks: { thumbnail: 'https://books.google.com/other-cover.jpg' },
                  },
                },
              ],
            }),
            { status: 200 },
          )
        }
        if (url.includes('api.openbd.jp')) {
          return new Response(JSON.stringify([null]), { status: 200 })
        }
        if (url.startsWith('https://books.google.com/other-cover.jpg')) {
          return new Response(bytes(600, 1), {
            status: 200,
            headers: { 'Content-Type': 'image/jpeg' },
          })
        }
        return new Response('', { status: 404 })
      }),
    )

    const res = await app.fetch(
      new Request(`http://localhost/api/books/${isbn}/metadata`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({ location: 'daikanyama' }),
      }),
      env,
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { book: { title: string; cover: { src?: string } } }
    expect(body.book.title).toBe('新タイトル')
    expect(body.book.cover.src).toBe(selfThumbnailSrc(isbn))

    const stored = await env.THUMBNAILS.get(thumbnailKey(isbn))
    const storedBytes = new Uint8Array((await stored?.arrayBuffer()) ?? new ArrayBuffer(0))
    expect(storedBytes[0]).toBe(9)
  })
})

describe('PUT /api/books/:isbn/thumbnail', () => {
  const ISBN = '9784000000010'

  it('正常系: R2 に保存され複数 location の cover_src が全て self URL になる', async () => {
    await seedBook({ isbn: ISBN, location: 'daikanyama' })
    await seedBook({ isbn: ISBN, location: 'okinawa' })
    const cookie = await sessionCookie()

    const res = await app.fetch(
      new Request(`http://localhost/api/books/${ISBN}/thumbnail`, {
        method: 'PUT',
        headers: { 'Content-Type': 'image/jpeg', Cookie: cookie },
        body: bytes(600),
      }),
      env,
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { cover: { src: string } }
    expect(body.cover.src).toBe(selfThumbnailSrc(ISBN))

    const stored = await env.THUMBNAILS.get(thumbnailKey(ISBN))
    expect(stored).not.toBeNull()
    expect(stored?.httpMetadata?.contentType).toBe('image/jpeg')

    const { results } = await env.DB.prepare('SELECT location, cover_src FROM books WHERE isbn = ?')
      .bind(ISBN)
      .all<{ location: string; cover_src: string }>()
    expect(results).toHaveLength(2)
    for (const row of results) {
      expect(row.cover_src).toBe(selfThumbnailSrc(ISBN))
    }
  })

  it('存在しない ISBN は 404', async () => {
    const cookie = await sessionCookie()

    const res = await app.fetch(
      new Request('http://localhost/api/books/0000000000000/thumbnail', {
        method: 'PUT',
        headers: { 'Content-Type': 'image/jpeg', Cookie: cookie },
        body: bytes(600),
      }),
      env,
    )
    expect(res.status).toBe(404)
  })

  it('許可されないContent-Typeは415', async () => {
    await seedBook({ isbn: ISBN })
    const cookie = await sessionCookie()

    const res = await app.fetch(
      new Request(`http://localhost/api/books/${ISBN}/thumbnail`, {
        method: 'PUT',
        headers: { 'Content-Type': 'text/plain', Cookie: cookie },
        body: bytes(600),
      }),
      env,
    )
    expect(res.status).toBe(415)
  })

  it('512B未満は400', async () => {
    await seedBook({ isbn: ISBN })
    const cookie = await sessionCookie()

    const res = await app.fetch(
      new Request(`http://localhost/api/books/${ISBN}/thumbnail`, {
        method: 'PUT',
        headers: { 'Content-Type': 'image/jpeg', Cookie: cookie },
        body: bytes(100),
      }),
      env,
    )
    expect(res.status).toBe(400)
  })

  it('2MB超は413', async () => {
    await seedBook({ isbn: ISBN })
    const cookie = await sessionCookie()

    const res = await app.fetch(
      new Request(`http://localhost/api/books/${ISBN}/thumbnail`, {
        method: 'PUT',
        headers: { 'Content-Type': 'image/jpeg', Cookie: cookie },
        body: bytes(2 * 1024 * 1024 + 1),
      }),
      env,
    )
    expect(res.status).toBe(413)
  })
})
