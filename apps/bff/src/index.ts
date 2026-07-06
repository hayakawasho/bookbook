import { Hono } from 'hono'
import { getCookie } from 'hono/cookie'
import { cors } from 'hono/cors'

import { SESSION_COOKIE_NAME, type SessionUser, verifySession } from './auth'
import { authRoutes } from './routes/auth'
import { booksRoutes } from './routes/books'
import { historyRoutes } from './routes/history'

type Bindings = {
  DB: D1Database
  SLACK_WEBHOOK_URL: string
  GOOGLE_CLIENT_ID: string
  GOOGLE_CLIENT_SECRET: string
  GOOGLE_REDIRECT_URI: string
  AUTH_COOKIE_SECRET: string
  /** カンマ区切り（例: example.com,another.jp） */
  ALLOWED_EMAIL_DOMAINS: string
  /** ログイン後リダイレクト先パス（既定 `/`） */
  AUTH_SUCCESS_REDIRECT?: string
}

const app = new Hono<{ Bindings: Bindings; Variables: { sessionUser: SessionUser } }>()

app.use('/api/*', cors({ credentials: true }))

/** /api/auth/* と CORS の OPTIONS は除き、セッション必須 */
app.use('/api/*', async (c, next) => {
  if (c.req.method === 'OPTIONS') {
    return next()
  }
  const pathname = new URL(c.req.url).pathname
  if (pathname.startsWith('/api/auth')) {
    return next()
  }

  const secret = c.env.AUTH_COOKIE_SECRET
  if (!secret || secret.length < 16) {
    return c.json({ error: 'authentication is not configured' }, 503)
  }

  const raw = getCookie(c, SESSION_COOKIE_NAME)
  if (!raw) {
    return c.json({ error: 'unauthorized' }, 401)
  }

  const sessionUser = await verifySession(secret, raw)
  if (!sessionUser) {
    return c.json({ error: 'unauthorized' }, 401)
  }

  c.set('sessionUser', sessionUser)
  await next()
})

app.route('/api/auth', authRoutes)
app.route('/api/books', booksRoutes)
app.route('/api/history', historyRoutes)

export default app
