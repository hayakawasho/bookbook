import { env } from 'cloudflare:test'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { signSession } from './auth'
import app from './index'

const AUTH_TEST_ENV = {
  ...env,
  GOOGLE_CLIENT_ID: 'cid',
  GOOGLE_CLIENT_SECRET: 'gsecret',
  GOOGLE_REDIRECT_URI: 'http://localhost/api/auth/google/callback',
  ALLOWED_EMAIL_DOMAINS: 'example.com',
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('GET /api/auth/google/start', () => {
  it('OAuth 未設定時は 503', async () => {
    const res = await app.fetch(new Request('http://localhost/api/auth/google/start'), env)
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
    const res = await app.fetch(new Request('http://localhost/api/auth/me'), env)
    expect(res.status).toBe(401)
  })

  it('有効なセッション Cookie で user を返す', async () => {
    const token = await signSession(
      env.AUTH_COOKIE_SECRET,
      { email: 'user@example.com', name: 'Tester', hd: 'example.com' },
      3600,
    )
    const res = await app.fetch(
      new Request('http://localhost/api/auth/me', {
        headers: { Cookie: `bookbook_session=${token}` },
      }),
      env,
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

describe('セッション必須ミドルウェア', () => {
  it('/api/books はセッション Cookie なしで 401', async () => {
    const res = await app.fetch(new Request('http://localhost/api/books?location=daikanyama'), env)
    expect(res.status).toBe(401)
  })

  it('AUTH_COOKIE_SECRET 未設定なら 503', async () => {
    const res = await app.fetch(new Request('http://localhost/api/books?location=daikanyama'), {
      ...env,
      AUTH_COOKIE_SECRET: '',
    })
    expect(res.status).toBe(503)
  })
})
