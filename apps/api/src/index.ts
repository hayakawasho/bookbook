import { Hono } from 'hono'
import { deleteCookie, getCookie } from 'hono/cookie'

import {
  isAllowedSessionUser,
  parseEmailAllowlist,
  SESSION_COOKIE_NAME,
  type SessionUser,
  verifySession,
} from './auth'
import { authRoutes } from './routes/auth'
import { booksRoutes } from './routes/books'
import { historyRoutes } from './routes/history'
import { thumbnailsRoutes } from './routes/thumbnails'

type Bindings = {
  DB: D1Database
  THUMBNAILS: R2Bucket
  SLACK_WEBHOOK_URL: string
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
  /** 楽天ブックス書籍検索 API の applicationId（省略可: 省略時は表紙候補から楽天を除外） */
  RAKUTEN_APP_ID?: string
  /** 楽天ブックス書籍検索 API の accessKey */
  RAKUTEN_ACCESS_KEY?: string
  /** 楽天ウェブサービスに登録した BooKBooK の公開 URL */
  RAKUTEN_SITE_URL?: string
}

const app = new Hono<{ Bindings: Bindings; Variables: { sessionUser: SessionUser } }>()

// web は同一 Worker の assets 配信（開発は Vite プロキシ）で常に同一オリジンのため CORS は設定しない

/** /api/auth/* を除きセッション必須 */
app.use('/api/*', async (c, next) => {
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
  const allowlist = parseEmailAllowlist(c.env)
  if (!sessionUser || !isAllowedSessionUser(sessionUser, allowlist)) {
    deleteCookie(c, SESSION_COOKIE_NAME, { path: '/' })
    return c.json({ error: 'unauthorized' }, 401)
  }

  c.set('sessionUser', sessionUser)
  await next()
})

app.route('/api/auth', authRoutes)
app.route('/api/books', booksRoutes)
app.route('/api/history', historyRoutes)
app.route('/api/thumbnails', thumbnailsRoutes)

export default app
