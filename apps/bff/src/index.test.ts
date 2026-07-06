import { beforeEach, describe, expect, it, vi } from 'vitest'

import { signSession } from './auth'
import app from './index'

const TEST_ENV = {
  MICROCMS_DAIKANYAMA_API_KEY: 'test-key',
  MICROCMS_DAIKANYAMA_BASE_URL: 'https://microcms.test',
  MICROCMS_OKINAWA_API_KEY: '',
  MICROCMS_OKINAWA_BASE_URL: '',
  SLACK_WEBHOOK_URL: '',
  GOOGLE_CLIENT_ID: '',
  GOOGLE_CLIENT_SECRET: '',
  GOOGLE_REDIRECT_URI: '',
  AUTH_COOKIE_SECRET: '0123456789abcdef0123456789abcdef',
  ALLOWED_EMAIL_DOMAINS: '',
}

const AUTH_TEST_ENV = {
  ...TEST_ENV,
  GOOGLE_CLIENT_ID: 'cid',
  GOOGLE_CLIENT_SECRET: 'gsecret',
  GOOGLE_REDIRECT_URI: 'http://localhost/api/auth/google/callback',
  ALLOWED_EMAIL_DOMAINS: 'example.com',
}

const SLACK_NOTIFY_ENV = {
  ...TEST_ENV,
  SLACK_WEBHOOK_URL: 'https://hooks.slack.test/services/xxx',
}

describe('GET /api/auth/google/start', () => {
  it('OAuth 未設定時は 503', async () => {
    const res = await app.fetch(new Request('http://localhost/api/auth/google/start'), TEST_ENV)
    expect(res.status).toBe(503)
  })

  it('設定済みなら Google 認可へ 302', async () => {
    const res = await app.fetch(
      new Request('http://localhost/api/auth/google/start'),
      AUTH_TEST_ENV,
    )
    expect(res.status).toBe(302)
    const loc = res.headers.get('Location') ?? ''
    expect(loc).toContain('accounts.google.com')
    expect(loc).toContain('client_id=cid')
    expect(loc).toContain('redirect_uri=')
  })
})

describe('GET /api/auth/me', () => {
  it('セッションなしは 401', async () => {
    const res = await app.fetch(new Request('http://localhost/api/auth/me'), TEST_ENV)
    expect(res.status).toBe(401)
  })

  it('有効なセッション Cookie で user を返す', async () => {
    const token = await signSession(
      TEST_ENV.AUTH_COOKIE_SECRET,
      { email: 'user@example.com', name: 'Tester', hd: 'example.com' },
      3600,
    )
    const res = await app.fetch(
      new Request('http://localhost/api/auth/me', {
        headers: { Cookie: `bookbook_session=${token}` },
      }),
      TEST_ENV,
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      user: { email: string; name: string | null; hd: string | null }
    }
    expect(body.user).toEqual({
      email: 'user@example.com',
      name: 'Tester',
      hd: 'example.com',
    })
  })
})

function usableCoverResponse(byteLength = 600): Response {
  return new Response(new Uint8Array(byteLength).fill(0xff), {
    status: 200,
    headers: { 'Content-Type': 'image/jpeg' },
  })
}

function tinyOpenLibraryCoverResponse(): Response {
  return new Response(new Uint8Array(43).fill(0), {
    status: 200,
    headers: { 'Content-Type': 'image/gif' },
  })
}

function coverGetHandler(url: string, init?: RequestInit): Response | null {
  if (init?.method !== 'GET') return null
  if (url.includes('covers.openlibrary.org')) return tinyOpenLibraryCoverResponse()
  if (url.includes('cover.openbd.jp') || url.includes('books.google.com/books/content')) {
    return usableCoverResponse()
  }
  return null
}

describe('GET /api/books/:isbn (external + Open Library cover)', () => {
  let sessionCookie: string

  beforeEach(async () => {
    vi.restoreAllMocks()
    const token = await signSession(
      TEST_ENV.AUTH_COOKIE_SECRET,
      { email: 'user@example.com', name: 'Tester', hd: 'example.com' },
      3600,
    )
    sessionCookie = `bookbook_session=${token}`
  })

  it('OpenBD 表紙を Open Library の 1x1 より優先する', async () => {
    const isbn = '9784774194004'
    const openBdCover = `https://cover.openbd.jp/${isbn}.jpg`

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        const coverRes = coverGetHandler(url, init)
        if (coverRes) return coverRes

        if (url.includes('microcms.test/books?') && url.includes('filters=id')) {
          return new Response(
            JSON.stringify({ contents: [], totalCount: 0, offset: 0, limit: 1 }),
            {
              status: 200,
            },
          )
        }
        if (url.includes('googleapis.com/books')) {
          return new Response(JSON.stringify({ totalItems: 0 }), { status: 200 })
        }
        if (url.includes('api.openbd.jp')) {
          return new Response(
            JSON.stringify([
              {
                onix: { CollateralDetail: { TextContent: [] } },
                summary: { title: 'テスト書籍', cover: openBdCover },
              },
            ]),
            { status: 200 },
          )
        }

        throw new Error(`unexpected fetch: ${url} ${init?.method ?? 'GET'}`)
      }),
    )

    const res = await app.fetch(
      new Request(`http://localhost/api/books/${isbn}?location=daikanyama`, {
        headers: { Cookie: sessionCookie },
      }),
      TEST_ENV,
    )

    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      status: string
      book: { cover: { src?: string }; title: string }
    }
    expect(body.status).toBe('external')
    expect(body.book.cover.src).toBe(openBdCover)
  })

  it('OpenBD 正規 URL を表紙候補に含める', async () => {
    const isbn = '9784873119038'
    const openBdCover = `https://cover.openbd.jp/${isbn}.jpg`

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        const coverRes = coverGetHandler(url, init)
        if (coverRes) return coverRes

        if (url.includes('microcms.test/books?') && url.includes('filters=id')) {
          return new Response(
            JSON.stringify({ contents: [], totalCount: 0, offset: 0, limit: 1 }),
            {
              status: 200,
            },
          )
        }
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

        throw new Error(`unexpected fetch: ${url} ${init?.method ?? 'GET'}`)
      }),
    )

    const res = await app.fetch(
      new Request(`http://localhost/api/books/${isbn}?location=daikanyama`, {
        headers: { Cookie: sessionCookie },
      }),
      TEST_ENV,
    )

    expect(res.status).toBe(200)
    const body = (await res.json()) as { book: { cover: { src?: string } } }
    expect(body.book.cover.src).toBe(openBdCover)
  })
})

describe('PATCH /api/books/:isbn/metadata', () => {
  let sessionCookie: string

  beforeEach(async () => {
    vi.restoreAllMocks()
    const token = await signSession(
      TEST_ENV.AUTH_COOKIE_SECRET,
      { email: 'user@example.com', name: 'Tester', hd: 'example.com' },
      3600,
    )
    sessionCookie = `bookbook_session=${token}`
  })

  it('外部書誌で microCMS を PATCH し在庫は送らない', async () => {
    const isbn = '9784873117317'
    const openBdCover = `https://cover.openbd.jp/${isbn}.jpg`
    const cmsBook = {
      id: isbn,
      title: '旧タイトル',
      cover_metadata: {
        fieldId: 'img_metadata',
        src: `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`,
      },
      available_count: 3,
      total: 5,
    }

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        const coverRes = coverGetHandler(url, init)
        if (coverRes) return coverRes

        if (url.includes('microcms.test/books?') && url.includes('filters=id')) {
          return new Response(
            JSON.stringify({
              contents: [cmsBook],
              totalCount: 1,
              offset: 0,
              limit: 1,
            }),
            { status: 200 },
          )
        }
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
          return new Response(
            JSON.stringify([
              {
                onix: { CollateralDetail: { TextContent: [] } },
                summary: { title: 'Clean Architecture', cover: openBdCover },
              },
            ]),
            { status: 200 },
          )
        }
        if (url === `https://microcms.test/books/${isbn}` && init?.method === 'PATCH') {
          return new Response('{}', { status: 200 })
        }

        throw new Error(`unexpected fetch: ${url} ${init?.method ?? 'GET'}`)
      }),
    )

    const res = await app.fetch(
      new Request(`http://localhost/api/books/${isbn}/metadata`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: sessionCookie,
        },
        body: JSON.stringify({ location: 'daikanyama' }),
      }),
      TEST_ENV,
    )

    expect(res.status).toBe(200)

    const patchCall = vi
      .mocked(globalThis.fetch)
      .mock.calls.find(
        ([u, i]) =>
          String(u) === `https://microcms.test/books/${isbn}` &&
          (i as RequestInit)?.method === 'PATCH',
      )
    expect(patchCall).toBeDefined()
    const sentBody = JSON.parse((patchCall![1] as RequestInit).body as string)
    expect(sentBody.title).toBe('Clean Architecture')
    expect(sentBody.cover_metadata).toEqual({ fieldId: 'img_metadata', src: openBdCover })
    expect(sentBody).not.toHaveProperty('available_count')
    expect(sentBody).not.toHaveProperty('total')
  })

  it('CMS の 1x1 Open Library URL は無効なら OpenBD で置き換える', async () => {
    const isbn = '9784274224546'
    const badOl = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`
    const openBdCover = `https://cover.openbd.jp/${isbn}.jpg`
    const cmsBook = {
      id: isbn,
      title: '旧',
      cover_metadata: { fieldId: 'img_metadata', src: badOl },
      available_count: 1,
      total: 1,
    }

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        const coverRes = coverGetHandler(url, init)
        if (coverRes) return coverRes

        if (url.includes('microcms.test/books?') && url.includes('filters=id')) {
          return new Response(
            JSON.stringify({ contents: [cmsBook], totalCount: 1, offset: 0, limit: 1 }),
            {
              status: 200,
            },
          )
        }
        if (url.includes('googleapis.com/books')) {
          return new Response(JSON.stringify({ totalItems: 0 }), { status: 200 })
        }
        if (url.includes('api.openbd.jp')) {
          return new Response(
            JSON.stringify([
              {
                onix: { CollateralDetail: { TextContent: [] } },
                summary: { title: 'リファクタリング', cover: openBdCover },
              },
            ]),
            { status: 200 },
          )
        }
        if (url === `https://microcms.test/books/${isbn}` && init?.method === 'PATCH') {
          return new Response('{}', { status: 200 })
        }

        throw new Error(`unexpected fetch: ${url} ${init?.method ?? 'GET'}`)
      }),
    )

    const res = await app.fetch(
      new Request(`http://localhost/api/books/${isbn}/metadata`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
        body: JSON.stringify({ location: 'daikanyama' }),
      }),
      TEST_ENV,
    )

    expect(res.status).toBe(200)
    const patchCall = vi
      .mocked(globalThis.fetch)
      .mock.calls.find(
        ([u, i]) => String(u).endsWith(`/books/${isbn}`) && (i as RequestInit)?.method === 'PATCH',
      )
    const sentBody = JSON.parse((patchCall![1] as RequestInit).body as string)
    expect(sentBody.cover_metadata.src).toBe(openBdCover)
  })

  it('CMS の無効な Open Library 表紙は OpenBD 正規 URL に差し替える', async () => {
    const isbn = '9784774194004'
    const openBdCover = `https://cover.openbd.jp/${isbn}.jpg`
    const badOl = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`
    const cmsBook = {
      id: isbn,
      title: '旧',
      cover_metadata: { fieldId: 'img_metadata', src: badOl },
      available_count: 1,
      total: 1,
    }

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        const coverRes = coverGetHandler(url, init)
        if (coverRes) return coverRes

        if (url.includes('microcms.test/books?') && url.includes('filters=id')) {
          return new Response(
            JSON.stringify({ contents: [cmsBook], totalCount: 1, offset: 0, limit: 1 }),
            {
              status: 200,
            },
          )
        }
        if (url.includes('googleapis.com/books')) {
          return new Response(
            JSON.stringify({
              totalItems: 1,
              items: [
                { volumeInfo: { title: '超速!Webページ速度改善ガイド', authors: ['Author'] } },
              ],
            }),
            { status: 200 },
          )
        }
        if (url.includes('api.openbd.jp')) {
          return new Response(JSON.stringify([null]), { status: 200 })
        }
        if (url.endsWith(`/books/${isbn}`) && init?.method === 'PATCH') {
          return new Response('{}', { status: 200 })
        }

        throw new Error(`unexpected fetch: ${url} ${init?.method ?? 'GET'}`)
      }),
    )

    const res = await app.fetch(
      new Request(`http://localhost/api/books/${isbn}/metadata`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
        body: JSON.stringify({ location: 'daikanyama' }),
      }),
      TEST_ENV,
    )

    expect(res.status).toBe(200)
    const patchCall = vi
      .mocked(globalThis.fetch)
      .mock.calls.find(
        ([u, i]) => String(u).endsWith(`/books/${isbn}`) && (i as RequestInit)?.method === 'PATCH',
      )
    const sentBody = JSON.parse((patchCall![1] as RequestInit).body as string)
    expect(sentBody.cover_metadata).toEqual({ fieldId: 'img_metadata', src: openBdCover })
  })

  it('microCMS に存在しない ISBN は 404', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ contents: [], totalCount: 0, offset: 0, limit: 1 }), {
          status: 200,
        }),
      ),
    )

    const res = await app.fetch(
      new Request('http://localhost/api/books/0000000000000/metadata', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: sessionCookie,
        },
        body: JSON.stringify({ location: 'daikanyama' }),
      }),
      TEST_ENV,
    )

    expect(res.status).toBe(404)
  })
})

describe('POST /api/books', () => {
  let sessionCookie: string

  beforeEach(async () => {
    vi.restoreAllMocks()
    const token = await signSession(
      TEST_ENV.AUTH_COOKIE_SECRET,
      { email: 'user@example.com', name: 'Tester', hd: 'example.com' },
      3600,
    )
    sessionCookie = `bookbook_session=${token}`
  })

  function postBooks(body: object, opts?: { omitCookie?: boolean }) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (!opts?.omitCookie) {
      headers.Cookie = sessionCookie
    }
    return new Request('http://localhost/api/books', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })
  }

  it('セッション Cookie なしは 401（microCMS へは到達しない）', async () => {
    vi.stubGlobal('fetch', vi.fn())

    const res = await app.fetch(
      postBooks(
        {
          isbn: '1111111111111',
          title: '未認証',
          cover: {},
          location: 'daikanyama',
        },
        { omitCookie: true },
      ),
      TEST_ENV,
    )

    expect(res.status).toBe(401)
    expect(vi.mocked(globalThis.fetch)).not.toHaveBeenCalled()
  })

  it('cover あり: microCMS に fieldId 付きの cover_metadata を送り 201 を返す', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('{"id":"1234567890123"}', { status: 201 })),
    )

    const res = await app.fetch(
      postBooks({
        isbn: '1234567890123',
        title: 'テスト本',
        cover: { src: 'https://example.com/cover.jpg' },
        location: 'daikanyama',
      }),
      TEST_ENV,
    )

    expect(res.status).toBe(201)

    const mockFetch = vi.mocked(globalThis.fetch)
    const [url, init] = mockFetch.mock.calls[0]
    expect(String(url)).toContain('/books/1234567890123')
    const sentBody = JSON.parse((init as RequestInit).body as string)
    expect(sentBody.cover_metadata).toEqual({
      fieldId: 'img_metadata',
      src: 'https://example.com/cover.jpg',
    })
    expect(sentBody.available_count).toBe(1)
    expect(sentBody.total).toBe(1)
  })

  it('cover なし: payload に cover_metadata が含まれない', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 201 })))

    const res = await app.fetch(
      postBooks({
        isbn: '1234567890124',
        title: 'カバーなし本',
        cover: {},
        location: 'daikanyama',
      }),
      TEST_ENV,
    )

    expect(res.status).toBe(201)

    const mockFetch = vi.mocked(globalThis.fetch)
    const [, init] = mockFetch.mock.calls[0]
    const sentBody = JSON.parse((init as RequestInit).body as string)
    expect(sentBody).not.toHaveProperty('cover_metadata')
  })

  it('未対応 location: 503 と credentials エラーを返す', async () => {
    const res = await app.fetch(
      postBooks({
        isbn: '1234567890125',
        title: 'テスト本',
        cover: {},
        location: 'unknown-location',
      }),
      TEST_ENV,
    )

    expect(res.status).toBe(503)
    const body = (await res.json()) as Record<string, unknown>
    expect(body.error).toMatch(/credentials are not configured/)
  })

  it('author/publisher/description が空文字または未指定のとき: payload から省略される', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 201 })))

    const res = await app.fetch(
      postBooks({
        isbn: '1234567890127',
        title: 'フィールドなし本',
        author: '',
        publisher: '',
        description: '',
        cover: {},
        location: 'daikanyama',
      }),
      TEST_ENV,
    )

    expect(res.status).toBe(201)
    const mockFetch = vi.mocked(globalThis.fetch)
    const [, init] = mockFetch.mock.calls[0]
    const sentBody = JSON.parse((init as RequestInit).body as string)
    expect(sentBody).not.toHaveProperty('author')
    expect(sentBody).not.toHaveProperty('publisher')
    expect(sentBody).not.toHaveProperty('description')
  })

  it('microCMS が 400 を返したとき: 502 + upstreamStatus + upstreamBody を含む', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('INVALID_FIELD', { status: 400 })),
    )

    const res = await app.fetch(
      postBooks({
        isbn: '1234567890126',
        title: 'テスト本',
        cover: {},
        location: 'daikanyama',
      }),
      TEST_ENV,
    )

    expect(res.status).toBe(502)
    const body = (await res.json()) as Record<string, unknown>
    expect(body.upstreamStatus).toBe(400)
    expect(body.upstreamBody).toBe('INVALID_FIELD')
  })
})

describe('POST /api/history', () => {
  let sessionCookie: string

  beforeEach(async () => {
    vi.restoreAllMocks()
    const token = await signSession(
      TEST_ENV.AUTH_COOKIE_SECRET,
      { email: 'user@example.com', name: 'Tester', hd: 'example.com' },
      3600,
    )
    sessionCookie = `bookbook_session=${token}`
  })

  it('microCMS への作成ペイロードに borrower_email / borrower_name を含める', async () => {
    const microCMSBook = {
      id: '9784003101018',
      total: 1,
      available_count: 1,
      title: 'サンプル本',
    }

    const listBooksBody = JSON.stringify({
      contents: [microCMSBook],
      totalCount: 1,
      offset: 0,
      limit: 1,
    })

    const detailBody = JSON.stringify({
      id: 'hist-new-1',
      createdAt: '2026-01-15T12:00:00.000Z',
      isbn: '9784003101018',
      is_done: false,
      borrower_email: 'user@example.com',
      borrower_name: 'Tester',
      book_metadata: [microCMSBook],
    })

    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(new Response(listBooksBody, { status: 200 }))
        .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'hist-new-1' }), { status: 201 }))
        .mockResolvedValueOnce(new Response(detailBody, { status: 200 })),
    )

    const res = await app.fetch(
      new Request('http://localhost/api/history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: sessionCookie,
        },
        body: JSON.stringify({ isbn: '9784003101018', location: 'daikanyama' }),
      }),
      TEST_ENV,
    )

    expect(res.status).toBe(201)

    const mockFetch = vi.mocked(globalThis.fetch)
    const historyPostCall = mockFetch.mock.calls.find((args) => {
      const init = args[1] as RequestInit | undefined
      if (init?.method !== 'POST' || typeof init.body !== 'string') return false
      try {
        const j = JSON.parse(init.body) as Record<string, unknown>
        return j.borrower_email !== undefined && Array.isArray(j.book_metadata)
      } catch {
        return false
      }
    })
    expect(historyPostCall).toBeDefined()
    const sentBody = JSON.parse((historyPostCall![1] as RequestInit).body as string)
    expect(sentBody.borrower_email).toBe('user@example.com')
    expect(sentBody.borrower_name).toBe('Tester')

    const json = (await res.json()) as { borrowerEmail: string; borrowerName?: string }
    expect(json.borrowerEmail).toBe('user@example.com')
    expect(json.borrowerName).toBe('Tester')
  })
})

describe('GET /api/history', () => {
  let sessionCookie: string

  beforeEach(async () => {
    vi.restoreAllMocks()
    const token = await signSession(
      TEST_ENV.AUTH_COOKIE_SECRET,
      { email: 'user@example.com', name: 'Tester', hd: 'example.com' },
      3600,
    )
    sessionCookie = `bookbook_session=${token}`
  })

  it('microCMS 検索にログインユーザーの borrower_email と一致する filters を付ける', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ contents: [], totalCount: 0, offset: 0, limit: 100 }), {
          status: 200,
        }),
      ),
    )

    const res = await app.fetch(
      new Request('http://localhost/api/history?location=daikanyama', {
        headers: { Cookie: sessionCookie },
      }),
      TEST_ENV,
    )

    expect(res.status).toBe(200)
    const url = String(vi.mocked(globalThis.fetch).mock.calls[0][0])
    const filters = new URL(url).searchParams.get('filters')
    expect(filters).toContain('borrower_email[equals]user@example.com')
    expect(filters).not.toContain('[and]is_done')
  })

  it('isDone 指定時は borrower_email と is_done を AND で指定する', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ contents: [], totalCount: 0, offset: 0, limit: 100 }), {
          status: 200,
        }),
      ),
    )

    await app.fetch(
      new Request('http://localhost/api/history?location=daikanyama&isDone=false', {
        headers: { Cookie: sessionCookie },
      }),
      TEST_ENV,
    )

    const url = String(vi.mocked(globalThis.fetch).mock.calls[0][0])
    const filters = new URL(url).searchParams.get('filters')
    expect(filters).toBe('borrower_email[equals]user@example.com[and]is_done[equals]false')
  })
})

describe('PATCH /api/history/:id', () => {
  let sessionCookie: string

  beforeEach(async () => {
    vi.restoreAllMocks()
    const token = await signSession(
      TEST_ENV.AUTH_COOKIE_SECRET,
      { email: 'user@example.com', name: 'Tester', hd: 'example.com' },
      3600,
    )
    sessionCookie = `bookbook_session=${token}`
  })

  it('borrower_email がセッションと異なる履歴は 403（PATCH しない）', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 'h1', borrower_email: 'other@example.com' }), {
          status: 200,
        }),
      ),
    )

    const res = await app.fetch(
      new Request('http://localhost/api/history/h1', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: sessionCookie,
        },
        body: JSON.stringify({ isbn: '9784003101018', location: 'daikanyama' }),
      }),
      TEST_ENV,
    )

    expect(res.status).toBe(403)
    expect(vi.mocked(globalThis.fetch).mock.calls.length).toBe(1)
  })

  it('borrower_email が一致すれば microCMS を PATCH する', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ id: 'h1', borrower_email: 'user@example.com' }), {
            status: 200,
          }),
        )
        .mockResolvedValueOnce(new Response('{}', { status: 200 })),
    )

    const res = await app.fetch(
      new Request('http://localhost/api/history/h1', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: sessionCookie,
        },
        body: JSON.stringify({ isbn: '9784003101018', location: 'daikanyama' }),
      }),
      TEST_ENV,
    )

    expect(res.status).toBe(200)
    const mockFetch = vi.mocked(globalThis.fetch)
    expect(mockFetch.mock.calls.length).toBe(2)
    const [, patchInit] = mockFetch.mock.calls[1]!
    expect((patchInit as RequestInit).method).toBe('PATCH')
  })
})

describe('POST /api/notifications/slack', () => {
  it('貸出では Slack 本文にログインユーザーの名前を付ける（あるとき）', async () => {
    vi.restoreAllMocks()
    const token = await signSession(
      TEST_ENV.AUTH_COOKIE_SECRET,
      { email: 'user@example.com', name: '山田太郎', hd: 'example.com' },
      3600,
    )

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('ok', { status: 200 })))

    const res = await app.fetch(
      new Request('http://localhost/api/notifications/slack', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `bookbook_session=${token}`,
        },
        body: JSON.stringify({
          type: 'checkout',
          location: 'daikanyama',
          book: { title: 'サンプル本', isbn: '9784003101018', author: '著者' },
        }),
      }),
      SLACK_NOTIFY_ENV,
    )

    expect(res.status).toBe(200)
    const [, slackInit] = vi.mocked(globalThis.fetch).mock.calls[0]!
    const body = JSON.parse((slackInit as RequestInit).body as string) as { text: string }
    expect(body.text).toContain('貸出')
    expect(body.text).toContain('サンプル本')
    expect(body.text).toContain('山田太郎')
    expect(body.text).not.toContain('user@example.com')
  })

  it('貸出で名前がないときはメールを付ける', async () => {
    vi.restoreAllMocks()
    const token = await signSession(
      TEST_ENV.AUTH_COOKIE_SECRET,
      { email: 'nomailname@example.com', hd: 'example.com' },
      3600,
    )

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('ok', { status: 200 })))

    await app.fetch(
      new Request('http://localhost/api/notifications/slack', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `bookbook_session=${token}`,
        },
        body: JSON.stringify({
          type: 'checkout',
          location: 'daikanyama',
          book: { title: '本', isbn: '1' },
        }),
      }),
      SLACK_NOTIFY_ENV,
    )

    const [, slackInit] = vi.mocked(globalThis.fetch).mock.calls[0]!
    const body = JSON.parse((slackInit as RequestInit).body as string) as { text: string }
    expect(body.text).toContain('nomailname@example.com')
  })

  it('返却通知には借り手サフィックスを付けない', async () => {
    vi.restoreAllMocks()
    const token = await signSession(
      TEST_ENV.AUTH_COOKIE_SECRET,
      { email: 'user@example.com', name: 'Tester', hd: 'example.com' },
      3600,
    )

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('ok', { status: 200 })))

    await app.fetch(
      new Request('http://localhost/api/notifications/slack', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `bookbook_session=${token}`,
        },
        body: JSON.stringify({
          type: 'return',
          location: 'daikanyama',
          book: { title: '本', isbn: '1' },
        }),
      }),
      SLACK_NOTIFY_ENV,
    )

    const [, slackInit] = vi.mocked(globalThis.fetch).mock.calls[0]!
    const body = JSON.parse((slackInit as RequestInit).body as string) as { text: string }
    expect(body.text).toBe('[daikanyama] 📚 返却: 本')
    expect(body.text).not.toContain('Tester')
  })
})
