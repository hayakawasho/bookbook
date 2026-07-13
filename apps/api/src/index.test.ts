import { env } from 'cloudflare:test'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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

afterEach(() => {
  vi.unstubAllGlobals()
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

describe('GET /api/auth/google/callback', () => {
  it('許可していないメールアドレスを拒否する', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'access-token' })))
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              email: 'other@gmail.com',
              email_verified: true,
            }),
          ),
        ),
    )

    const res = await app.fetch(
      new Request('http://localhost/api/auth/google/callback?code=code&state=state', {
        headers: { Cookie: 'bookbook_oauth_state=state' },
      }),
      {
        ...AUTH_TEST_ENV,
        ALLOWED_EMAILS: 'owner@gmail.com',
      },
    )

    expect(res.status).toBe(302)
    expect(res.headers.get('Location')).toBe('/?auth_error=domain_not_allowed')
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
      user: { email: string; name: string | null; hd: string | null; picture: string | null }
    }
    expect(body.user).toEqual({
      email: 'user@example.com',
      name: 'Tester',
      hd: 'example.com',
      picture: null,
    })
  })

  it('許可リスト外になった有効なセッションを拒否する', async () => {
    const token = await signSession(env.AUTH_COOKIE_SECRET, { email: 'other@gmail.com' }, 3600)
    const res = await app.fetch(
      new Request('http://localhost/api/auth/me', {
        headers: { Cookie: `bookbook_session=${token}` },
      }),
      {
        ...AUTH_TEST_ENV,
        ALLOWED_EMAILS: 'owner@gmail.com',
      },
    )

    expect(res.status).toBe(401)
  })
})

describe('セッション必須ミドルウェア', () => {
  it('/api/books はセッション Cookie なしで 401', async () => {
    const res = await app.fetch(new Request('http://localhost/api/books?location=daikanyama'), env)
    expect(res.status).toBe(401)
  })

  it('許可リスト外になった有効なセッションで /api/books を拒否する', async () => {
    const token = await signSession(env.AUTH_COOKIE_SECRET, { email: 'other@gmail.com' }, 3600)
    const res = await app.fetch(
      new Request('http://localhost/api/books?location=daikanyama', {
        headers: { Cookie: `bookbook_session=${token}` },
      }),
      {
        ...AUTH_TEST_ENV,
        ALLOWED_EMAILS: 'owner@gmail.com',
      },
    )

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
