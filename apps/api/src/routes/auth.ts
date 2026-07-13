import { Hono } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'

import {
  CSRF_COOKIE_NAME,
  CSRF_MAX_AGE_SEC,
  isAllowedEmailIdentity,
  isAllowedSessionUser,
  isEmailAllowlistConfigured,
  parseEmailAllowlist,
  requestUsesHttps,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SEC,
  type SessionUser,
  signSession,
  verifySession,
} from '../auth'

export type AuthBindings = {
  GOOGLE_CLIENT_ID: string
  GOOGLE_CLIENT_SECRET: string
  GOOGLE_REDIRECT_URI: string
  AUTH_COOKIE_SECRET: string
  /** カンマ区切り（例: example.com,another.jp） */
  ALLOWED_EMAIL_DOMAINS: string
  /** 個別に許可するメールアドレス（カンマ区切り） */
  ALLOWED_EMAILS?: string
  /** ログイン後リダイレクト先パス（既定 `/`） */
  AUTH_SUCCESS_REDIRECT?: string
}

type GoogleTokenResponse = {
  access_token?: string
}

type GoogleUserInfo = {
  email?: string
  email_verified?: boolean
  name?: string
  hd?: string
  picture?: string
}

function cookieSecure(c: { req: { url: string } }): boolean {
  return requestUsesHttps(c.req.url)
}

function authSuccessPath(env: AuthBindings): string {
  const p = env.AUTH_SUCCESS_REDIRECT?.trim() || '/'
  return p.startsWith('/') ? p : `/${p}`
}

function requireOAuthEnv(env: AuthBindings): AuthBindings | null {
  if (
    !env.GOOGLE_CLIENT_ID ||
    !env.GOOGLE_CLIENT_SECRET ||
    !env.GOOGLE_REDIRECT_URI ||
    !env.AUTH_COOKIE_SECRET ||
    env.AUTH_COOKIE_SECRET.length < 16
  ) {
    return null
  }
  return env
}

export const authRoutes = new Hono<{
  Bindings: AuthBindings
  Variables: { sessionUser: SessionUser }
}>()

// GET /api/auth/google/start
authRoutes.get('/google/start', async (c) => {
  const e = requireOAuthEnv(c.env)
  if (!e) {
    return c.json({ error: 'OAuth is not configured' }, 503)
  }
  const allowlist = parseEmailAllowlist(e)
  if (!isEmailAllowlistConfigured(allowlist)) {
    return c.json({ error: 'email allowlist is not configured' }, 503)
  }

  const state = crypto.randomUUID()
  const secure = cookieSecure(c)
  setCookie(c, CSRF_COOKIE_NAME, state, {
    httpOnly: true,
    secure,
    maxAge: CSRF_MAX_AGE_SEC,
    sameSite: 'Lax',
    path: '/',
  })

  const params = new URLSearchParams({
    client_id: e.GOOGLE_CLIENT_ID,
    redirect_uri: e.GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  })
  return c.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`, 302)
})

// GET /api/auth/google/callback
authRoutes.get('/google/callback', async (c) => {
  const successPath = authSuccessPath(c.env)
  const secure = cookieSecure(c)

  const oauthError = c.req.query('error')
  if (oauthError) {
    deleteCookie(c, CSRF_COOKIE_NAME, { path: '/' })
    return c.redirect(`${successPath}?auth_error=${encodeURIComponent(oauthError)}`, 302)
  }

  const e = requireOAuthEnv(c.env)
  if (!e) {
    deleteCookie(c, CSRF_COOKIE_NAME, { path: '/' })
    return c.json({ error: 'OAuth is not configured' }, 503)
  }

  const code = c.req.query('code')
  const state = c.req.query('state')
  const saved = getCookie(c, CSRF_COOKIE_NAME)
  deleteCookie(c, CSRF_COOKIE_NAME, { path: '/' })

  if (!code || !state || !saved || state !== saved) {
    return c.redirect(`${successPath}?auth_error=invalid_state`, 302)
  }

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: e.GOOGLE_CLIENT_ID,
      client_secret: e.GOOGLE_CLIENT_SECRET,
      redirect_uri: e.GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  })

  if (!tokenRes.ok) {
    return c.redirect(`${successPath}?auth_error=token_exchange_failed`, 302)
  }

  const tokens = (await tokenRes.json()) as GoogleTokenResponse
  const accessToken = tokens.access_token
  if (!accessToken) {
    return c.redirect(`${successPath}?auth_error=no_access_token`, 302)
  }

  const userRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!userRes.ok) {
    return c.redirect(`${successPath}?auth_error=userinfo_failed`, 302)
  }

  const user = (await userRes.json()) as GoogleUserInfo
  const email = user.email
  if (!email) {
    return c.redirect(`${successPath}?auth_error=no_email`, 302)
  }

  const allowlist = parseEmailAllowlist(e)
  if (!isAllowedEmailIdentity(email, user.email_verified, user.hd, allowlist)) {
    return c.redirect(`${successPath}?auth_error=domain_not_allowed`, 302)
  }

  const sessionToken = await signSession(
    e.AUTH_COOKIE_SECRET,
    { email, name: user.name, hd: user.hd, picture: user.picture },
    SESSION_MAX_AGE_SEC,
  )

  setCookie(c, SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure,
    maxAge: SESSION_MAX_AGE_SEC,
    sameSite: 'Lax',
    path: '/',
  })

  return c.redirect(successPath, 302)
})

// GET /api/auth/me
authRoutes.get('/me', async (c) => {
  const secret = c.env.AUTH_COOKIE_SECRET
  if (!secret || secret.length < 16) {
    return c.json({ error: 'session signing is not configured' }, 503)
  }
  const raw = getCookie(c, SESSION_COOKIE_NAME)
  if (!raw) {
    return c.json({ error: 'unauthorized' }, 401)
  }
  const user = await verifySession(secret, raw)
  const allowlist = parseEmailAllowlist(c.env)
  if (!user || !isAllowedSessionUser(user, allowlist)) {
    deleteCookie(c, SESSION_COOKIE_NAME, { path: '/' })
    return c.json({ error: 'unauthorized' }, 401)
  }
  return c.json({
    user: {
      email: user.email,
      name: user.name ?? null,
      hd: user.hd ?? null,
      picture: user.picture ?? null,
    },
  })
})

// POST /api/auth/logout
authRoutes.post('/logout', async (c) => {
  deleteCookie(c, SESSION_COOKIE_NAME, { path: '/' })
  return c.json({ ok: true })
})
