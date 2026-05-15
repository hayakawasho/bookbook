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

function postBooks(body: object) {
  return new Request('http://localhost/api/books', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('GET /api/auth/google/start', () => {
  it('OAuth 未設定時は 503', async () => {
    const res = await app.fetch(new Request('http://localhost/api/auth/google/start'), TEST_ENV)
    expect(res.status).toBe(503)
  })

  it('設定済みなら Google 認可へ 302', async () => {
    const res = await app.fetch(new Request('http://localhost/api/auth/google/start'), AUTH_TEST_ENV)
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

describe('POST /api/books', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
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
    expect(sentBody.cover_metadata).toEqual({ fieldId: 'img_metadata', src: 'https://example.com/cover.jpg' })
    expect(sentBody.available_count).toBe(1)
    expect(sentBody.total).toBe(1)
  })

  it('cover なし: payload に cover_metadata が含まれない', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('{}', { status: 201 })),
    )

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
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('{}', { status: 201 })),
    )

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
