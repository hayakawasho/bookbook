import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { XMLParser } from 'fast-xml-parser'
import {
  CSRF_COOKIE_NAME,
  CSRF_MAX_AGE_SEC,
  isAllowedWorkspaceUser,
  parseAllowedDomains,
  requestUsesHttps,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SEC,
  signSession,
  verifySession,
  type SessionUser,
} from './auth'

type Bindings = {
  MICROCMS_DAIKANYAMA_API_KEY: string
  MICROCMS_DAIKANYAMA_BASE_URL: string
  MICROCMS_OKINAWA_API_KEY: string
  MICROCMS_OKINAWA_BASE_URL: string
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

type MicroCMSListResponse<T> = {
  contents: T[]
  totalCount: number
  offset: number
  limit: number
}

type MicroCMSCoverMetadata = {
  fieldId?: string
  src: string
  width?: number
  height?: number
  aspect?: number
}

/** microCMS 「books」の API レスポンスに合わせた形（コンテンツ id = ISBN） */
type MicroCMSBook = {
  id: string
  createdAt?: string
  updatedAt?: string
  publishedAt?: string
  revisedAt?: string
  total: number
  available_count: number
  title: string
  cover_metadata?: MicroCMSCoverMetadata | null
  author?: string
  publisher?: string
  description?: string
  published_date?: string
  page_count?: number
}

/** microCMS 「history」。書籍詳細は book_metadata にネストされる */
type MicroCMSHistory = {
  id: string
  createdAt?: string
  updatedAt?: string
  publishedAt?: string
  revisedAt?: string
  is_done?: boolean
  isbn: string
  book_metadata?: MicroCMSBook[]
  checkout_date?: string
  return_date?: string
  borrower_email?: string | null
  borrower_name?: string | null
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

type GoogleTokenResponse = {
  access_token?: string
}

type GoogleUserInfo = {
  email?: string
  email_verified?: boolean
  name?: string
  hd?: string
}

function cookieSecure(c: { req: { url: string } }): boolean {
  return requestUsesHttps(c.req.url)
}

function authSuccessPath(env: Bindings): string {
  const p = env.AUTH_SUCCESS_REDIRECT?.trim() || '/'
  return p.startsWith('/') ? p : `/${p}`
}

function requireOAuthEnv(env: Bindings): Bindings | null {
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

// GET /api/auth/google/start
app.get('/api/auth/google/start', async c => {
  const e = requireOAuthEnv(c.env)
  if (!e) {
    return c.json({ error: 'OAuth is not configured' }, 503)
  }
  const allowed = parseAllowedDomains(e.ALLOWED_EMAIL_DOMAINS)
  if (allowed.length === 0) {
    return c.json({ error: 'ALLOWED_EMAIL_DOMAINS is not configured' }, 503)
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
app.get('/api/auth/google/callback', async c => {
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

  const allowed = parseAllowedDomains(e.ALLOWED_EMAIL_DOMAINS)
  if (!isAllowedWorkspaceUser(email, user.email_verified, user.hd, allowed)) {
    return c.redirect(`${successPath}?auth_error=domain_not_allowed`, 302)
  }

  const sessionToken = await signSession(
    e.AUTH_COOKIE_SECRET,
    { email, name: user.name, hd: user.hd },
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
app.get('/api/auth/me', async c => {
  const secret = c.env.AUTH_COOKIE_SECRET
  if (!secret || secret.length < 16) {
    return c.json({ error: 'session signing is not configured' }, 503)
  }
  const raw = getCookie(c, SESSION_COOKIE_NAME)
  if (!raw) {
    return c.json({ error: 'unauthorized' }, 401)
  }
  const user = await verifySession(secret, raw)
  if (!user) {
    return c.json({ error: 'unauthorized' }, 401)
  }
  return c.json({
    user: { email: user.email, name: user.name ?? null, hd: user.hd ?? null },
  })
})

// POST /api/auth/logout
app.post('/api/auth/logout', async c => {
  deleteCookie(c, SESSION_COOKIE_NAME, { path: '/' })
  return c.json({ ok: true })
})

function requireCmsEnv(env: Bindings, location: string): { apiKey: string; baseUrl: string } | null {
  switch (location) {
    case 'daikanyama':
      if (!env.MICROCMS_DAIKANYAMA_API_KEY || !env.MICROCMS_DAIKANYAMA_BASE_URL) return null
      return { apiKey: env.MICROCMS_DAIKANYAMA_API_KEY, baseUrl: env.MICROCMS_DAIKANYAMA_BASE_URL }
    case 'okinawa':
      if (!env.MICROCMS_OKINAWA_API_KEY || !env.MICROCMS_OKINAWA_BASE_URL) return null
      return { apiKey: env.MICROCMS_OKINAWA_API_KEY, baseUrl: env.MICROCMS_OKINAWA_BASE_URL }
    default:
      return null
  }
}

function cmsHeaders(apiKey: string) {
  return { 'X-MICROCMS-API-KEY': apiKey }
}

function bookFromCMS(raw: MicroCMSBook) {
  return {
    isbn: raw.id,
    title: raw.title,
    author: raw.author,
    publisher: raw.publisher,
    publishedDate: raw.published_date,
    cover: { src: raw.cover_metadata?.src },
    description: raw.description,
    availableCount: raw.available_count,
    total: raw.total,
  }
}

function historyFromCMS(raw: MicroCMSHistory) {
  const meta = raw.book_metadata?.[0]
  const fromBook = meta ? bookFromCMS(meta) : null

  const checkout = raw.checkout_date ?? raw.createdAt ?? ''

  const ret = raw.return_date

  const borrowerEmail = raw.borrower_email?.trim() ?? ''
  const borrowerNameRaw = raw.borrower_name?.trim()
  const borrowerName = borrowerNameRaw ? borrowerNameRaw : undefined

  if (!fromBook) {
    return {
      historyId: raw.id,
      isbn: raw.isbn,
      title: '',
      author: undefined,
      publisher: undefined,
      publishedDate: undefined,
      cover: {},
      description: undefined,
      availableCount: 0,
      total: 0,
      checkoutDate: checkout,
      returnDate: ret,
      isDone: raw.is_done ?? false,
      borrowerEmail,
      ...(borrowerName ? { borrowerName } : {}),
    }
  }

  return {
    historyId: raw.id,
    isbn: raw.isbn || fromBook.isbn,
    title: fromBook.title,
    author: fromBook.author,
    publisher: fromBook.publisher,
    publishedDate: fromBook.publishedDate,
    cover: fromBook.cover,
    description: fromBook.description,
    availableCount: fromBook.availableCount,
    total: fromBook.total,
    checkoutDate: checkout,
    returnDate: ret,
    isDone: raw.is_done ?? false,
    borrowerEmail,
    ...(borrowerName ? { borrowerName } : {}),
  }
}

/** microCMS 外の書籍メタ（クライアントの ExternalBookInfo に対応。日付は JSON のため ISO 文字列） */
type ExternalBookPayload = {
  isbn: string
  title: string
  author?: string
  publisher?: string
  publishedDate?: string
  description?: string
  cover: { src?: string }
}

const ndlXmlParser = new XMLParser({ ignoreDeclaration: true })

function isEmpty(value: unknown): boolean {
  if (value === undefined || value === null) return true
  if (typeof value === 'string' && value.trim() === '') return true
  if (typeof value === 'object' && value !== null) {
    const o = value as Record<string, unknown>
    if ('src' in o) {
      const src = o.src
      return src === undefined || src === '' || (typeof src === 'string' && src.trim() === '')
    }
    return Object.keys(o).length === 0
  }
  return false
}

function stripNonEmptyEntries<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => !isEmpty(v))) as Partial<T>
}

function parseFlexibleDate(raw: unknown): string | undefined {
  if (raw === undefined || raw === null) return undefined
  const s = String(raw).trim()
  if (!s) return undefined
  // OpenBD の pubdate は "YYYYMM" 6桁形式。new Date("202509") は year 202509 として解釈されるため先に正規化する
  if (/^\d{6}$/.test(s)) {
    return new Date(`${s.slice(0, 4)}-${s.slice(4, 6)}-01`).toISOString()
  }
  const d = new Date(s)
  if (!Number.isNaN(d.getTime())) return d.toISOString()
  return undefined
}

type GoogleVolumeItem = {
  volumeInfo?: {
    title?: string
    subtitle?: string
    authors?: string[]
    publisher?: string
    publishedDate?: string
    description?: string
    imageLinks?: { thumbnail?: string }
  }
}

type GoogleVolumesResponse = {
  totalItems?: number
  items?: GoogleVolumeItem[]
}

type OpenBdEntry = {
  onix?: {
    DescriptiveDetail?: {
      Subject?: Array<{
        SubjectHeadingText?: string
        SubjectSchemeIdentifier?: string
        SubjectCode?: string
      }>
    }
    CollateralDetail?: {
      TextContent?: Array<{ TextType?: string; Text?: string }>
    }
  }
  summary?: {
    title?: string
    author?: string
    publisher?: string
    cover?: string
    pubdate?: string
    isbn?: string
  }
}

function extractOpenBdDescription(onix: NonNullable<OpenBdEntry['onix']>): string | undefined {
  const texts = onix.CollateralDetail?.TextContent
  const picked = texts?.find(t => ['03', '02', '04'].includes(t.TextType ?? ''))
  const text = picked?.Text
  return typeof text === 'string' && text.trim() !== '' ? text : undefined
}

function convertGoogleVolume(isbn: string, item: GoogleVolumeItem): ExternalBookPayload | null {
  const vi = item.volumeInfo
  const titleBase = `${vi?.title ?? ''} ${vi?.subtitle ?? ''}`.trim()
  if (!titleBase) return null

  return {
    isbn,
    title: titleBase,
    author: vi?.authors?.join(', '),
    publisher: vi?.publisher,
    publishedDate: parseFlexibleDate(vi?.publishedDate),
    description: vi?.description,
    cover: { src: vi?.imageLinks?.thumbnail },
  }
}

function convertOpenBdEntry(isbn: string, raw: OpenBdEntry | null): ExternalBookPayload | null {
  if (!raw?.onix || !raw.summary) return null
  const summary = raw.summary
  const title = summary.title?.trim()
  if (!title) return null

  const description = extractOpenBdDescription(raw.onix)

  return {
    isbn,
    title,
    author: summary.author,
    publisher: summary.publisher,
    publishedDate: parseFlexibleDate(summary.pubdate),
    description,
    cover: { src: summary.cover },
  }
}

function formatNdlAuthor(author: string | string[] | undefined): string | undefined {
  const normalize = (a: string) => a.replace(/,/g, '')
  if (author === undefined) return undefined
  if (Array.isArray(author)) {
    const parts = author.map(a => normalize(String(a))).filter(Boolean)
    return parts.length > 0 ? parts.join(', ') : undefined
  }
  const one = normalize(String(author))
  return one.trim() === '' ? undefined : one
}

function convertNdlOpenSearch(isbn: string, xml: string): ExternalBookPayload | null {
  let parsed: unknown
  try {
    parsed = ndlXmlParser.parse(xml)
  } catch {
    return null
  }

  const rss = (parsed as { rss?: { channel?: { item?: unknown } } }).rss
  const item = rss?.channel?.item
  if (item === undefined || item === null) return null

  const first = Array.isArray(item) ? item[0] : item
  if (!first || typeof first !== 'object') return null

  const row = first as Record<string, unknown>
  const title = row.title
  if (typeof title !== 'string' || title.trim() === '') return null

  return {
    isbn,
    title,
    author: formatNdlAuthor(row['dc:creator'] as string | string[] | undefined),
    publisher:
      typeof row['dc:publisher'] === 'string' && row['dc:publisher'].trim() !== ''
        ? row['dc:publisher']
        : undefined,
    publishedDate: parseFlexibleDate(row['dcterms:issued']),
    cover: {},
  }
}

async function fetchGoogleVolume(isbn: string): Promise<ExternalBookPayload | null> {
  const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(isbn)}&maxResults=1`
  const res = await fetch(url)
  if (!res.ok) return null
  const data = (await res.json()) as GoogleVolumesResponse
  if (!data.totalItems || data.totalItems <= 0 || !data.items?.[0]) return null
  return convertGoogleVolume(isbn, data.items[0])
}

async function fetchOpenBd(isbn: string): Promise<ExternalBookPayload | null> {
  const res = await fetch(`https://api.openbd.jp/v1/get?isbn=${encodeURIComponent(isbn)}`)
  if (!res.ok) return null
  const data = (await res.json()) as Array<OpenBdEntry | null>
  const first = data[0]
  if (!first) return null
  const converted = convertOpenBdEntry(isbn, first)
  if (!converted) return null
  return converted
}

function mergeGoogleAndOpenBd(
  isbn: string,
  openBd: ExternalBookPayload | null,
  google: ExternalBookPayload | null,
): ExternalBookPayload | null {
  if (!openBd && !google) return null
  if (!openBd && google) return { ...google, isbn }
  if (openBd && !google) return { ...openBd, isbn }

  const o = stripNonEmptyEntries(openBd as unknown as Record<string, unknown>) as Partial<ExternalBookPayload>
  const g = stripNonEmptyEntries(google as unknown as Record<string, unknown>) as Partial<ExternalBookPayload>

  const title = `${g.title ?? o.title ?? ''}`.trim()
  if (!title) return null

  return {
    ...o,
    ...g,
    isbn,
    title,
    cover: {
      src: openBd!.cover?.src || google!.cover?.src,
    },
  }
}

async function fetchExternalBookMetadata(isbn: string): Promise<ExternalBookPayload | null> {
  const [google, openBd] = await Promise.all([fetchGoogleVolume(isbn), fetchOpenBd(isbn)])
  const primary = mergeGoogleAndOpenBd(isbn, openBd, google)
  if (primary?.title) return primary

  const ndlRes = await fetch(
    `https://iss.ndl.go.jp/api/opensearch?isbn=${encodeURIComponent(isbn)}&cnt=1`,
  )
  if (!ndlRes.ok) return null
  const xml = await ndlRes.text()
  const ndl = convertNdlOpenSearch(isbn, xml)
  if (!ndl?.title) return null

  const thumbUri = `https://iss.ndl.go.jp/thumbnail/${encodeURIComponent(isbn)}`
  const thumbOk = await fetch(thumbUri).then(r => r.ok)

  return {
    ...ndl,
    cover: {
      src: thumbOk ? thumbUri : undefined,
    },
  }
}

// GET /api/books?q=&location=
app.get('/api/books', async c => {
  const { q = '', location } = c.req.query()
  if (!location) return c.json({ error: 'location is required' }, 400)

	const cms = requireCmsEnv(c.env, location)

  if (cms === null && !['daikanyama', 'okinawa'].includes(location)) {
    return c.json({ error: 'unknown location' }, 400)
  }

  if (!cms) return c.json({ error: 'microCMS credentials are not configured for this location' }, 503)

  const params = new URLSearchParams({ limit: '100' })
  if (q) params.set('q', q)

  const res = await fetch(`${cms.baseUrl}/books?${params}`, { headers: cmsHeaders(cms.apiKey) })
  if (!res.ok) return c.json({ error: 'microCMS request failed' }, 502)

  const data = (await res.json()) as MicroCMSListResponse<MicroCMSBook>
  return c.json(data.contents.map(bookFromCMS))
})

// GET /api/books/:isbn?location=
app.get('/api/books/:isbn', async c => {
  const isbn = c.req.param('isbn')
  const { location } = c.req.query()
  if (!location) return c.json({ error: 'location is required' }, 400)

  const cms = requireCmsEnv(c.env, location)
  if (!cms) return c.json({ error: 'microCMS credentials are not configured for this location' }, 503)

  const params = new URLSearchParams({ filters: `id[equals]${isbn}`, limit: '1' })
  const res = await fetch(`${cms.baseUrl}/books?${params}`, { headers: cmsHeaders(cms.apiKey) })
  if (!res.ok) return c.json({ error: 'microCMS request failed' }, 502)

  const data = (await res.json()) as MicroCMSListResponse<MicroCMSBook>
  if (data.contents.length > 0) {
    return c.json({ status: 'registered', book: bookFromCMS(data.contents[0]) })
  }

  const external = await fetchExternalBookMetadata(isbn)
  if (external?.title) {
    return c.json({
      status: 'external',
      book: external,
    })
  }

  return c.json({ status: 'notfound' }, 404)
})

// POST /api/books
app.post('/api/books', async c => {
  const body = await c.req.json<{
    isbn: string
    title: string
    author?: string
    publisher?: string
    cover?: { src?: string }
    description?: string
    location: string
  }>()

	const cms = requireCmsEnv(c.env, body.location)

  if (!cms) return c.json({ error: 'microCMS credentials are not configured for this location' }, 503)

  const payload: Record<string, unknown> = stripNonEmptyEntries({
    title: body.title,
    available_count: 1,
    total: 1,
    author: body.author,
    publisher: body.publisher,
    description: body.description,
    cover_metadata: body.cover?.src ? { fieldId: 'img_metadata', src: body.cover.src } : undefined,
  }) as Record<string, unknown>

  const res = await fetch(`${cms.baseUrl}/books/${body.isbn}`, {
    method: 'PUT',
    headers: { ...cmsHeaders(cms.apiKey), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const errBody = await res.text().catch(() => '<unreadable>')
    console.error('microCMS POST /books failed', { status: res.status, body: errBody, sentPayload: payload })
    return c.json({ error: 'microCMS request failed', upstreamStatus: res.status, upstreamBody: errBody }, 502)
  }

  return c.json({ ok: true }, 201)
})

// PATCH /api/books/:isbn/count
app.patch('/api/books/:isbn/count', async c => {
  const isbn = c.req.param('isbn')
  const { operation, location } = await c.req.json<{
    operation: 'add-copy' | 'checkout' | 'return'
    location: string
  }>()

  const cms = requireCmsEnv(c.env, location)
  if (!cms) return c.json({ error: 'microCMS credentials are not configured for this location' }, 503)

  const findRes = await fetch(`${cms.baseUrl}/books?filters=id[equals]${isbn}&limit=1`, {
    headers: cmsHeaders(cms.apiKey),
	})

	if (!findRes.ok) return c.json({ error: 'microCMS request failed' }, 502)

	const found = (await findRes.json()) as MicroCMSListResponse<MicroCMSBook>

  if (found.contents.length === 0) return c.json({ error: 'book not found' }, 404)

  const book = found.contents[0]
  let availableCount = book.available_count
  let total = book.total

  switch (operation) {
    case 'add-copy':
      total += 1
      availableCount += 1
      break
    case 'checkout':
      if (availableCount <= 0) return c.json({ error: 'not available' }, 409)
      availableCount -= 1
      break
    case 'return':
      if (availableCount >= total) return c.json({ error: 'already fully returned' }, 409)
      availableCount += 1
      break
  }

  const patchRes = await fetch(`${cms.baseUrl}/books/${book.id}`, {
    method: 'PATCH',
    headers: { ...cmsHeaders(cms.apiKey), 'Content-Type': 'application/json' },
    body: JSON.stringify({ available_count: availableCount, total }),
	})

	if (!patchRes.ok) return c.json({ error: 'microCMS request failed' }, 502)

  return c.json({ ok: true })
})

/** microCMS 一覧 GET の filters: ログインユーザーの borrower_email とオプションの is_done */
function historyListFilters(email: string, isDone?: string): string {
  const borrower = `borrower_email[equals]${email}`
  if (isDone !== undefined) {
    return `${borrower}[and]is_done[equals]${isDone}`
  }
  return borrower
}

// GET /api/history?location=&isDone=
app.get('/api/history', async c => {
  const sessionUser = c.get('sessionUser')
  const { location, isDone } = c.req.query()
  if (!location) return c.json({ error: 'location is required' }, 400)

  const cms = requireCmsEnv(c.env, location)
  if (!cms) return c.json({ error: 'microCMS credentials are not configured for this location' }, 503)

  const params = new URLSearchParams({
    limit: '100',
    depth: '2',
    filters: historyListFilters(sessionUser.email, isDone),
  })

  const res = await fetch(`${cms.baseUrl}/history?${params}`, { headers: cmsHeaders(cms.apiKey) })
  if (!res.ok) return c.json({ error: 'microCMS request failed' }, 502)

  const data = (await res.json()) as MicroCMSListResponse<MicroCMSHistory>
  return c.json(data.contents.map(historyFromCMS))
})

// POST /api/history
app.post('/api/history', async c => {
  const { isbn, location } = await c.req.json<{ isbn: string; location: string }>()
  const sessionUser = c.get('sessionUser')

  const cms = requireCmsEnv(c.env, location)
  if (!cms) return c.json({ error: 'microCMS credentials are not configured for this location' }, 503)

  // 書籍メタデータを取得
  const bookRes = await fetch(`${cms.baseUrl}/books?filters=id[equals]${isbn}&limit=1`, {
    headers: cmsHeaders(cms.apiKey),
  })
  if (!bookRes.ok) return c.json({ error: 'microCMS request failed' }, 502)
  const bookData = (await bookRes.json()) as MicroCMSListResponse<MicroCMSBook>
  if (bookData.contents.length === 0) return c.json({ error: 'book not found' }, 404)
  const book = bookData.contents[0]

  const payload: Record<string, unknown> = {
    isbn: book.id,
    book_metadata: [book.id],
    is_done: false,
    borrower_email: sessionUser.email,
    borrower_name: sessionUser.name ?? '',
  }

  const createRes = await fetch(`${cms.baseUrl}/history`, {
    method: 'POST',
    headers: { ...cmsHeaders(cms.apiKey), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
	})

	if (!createRes.ok) return c.json({ error: 'microCMS request failed' }, 502)

  const created = (await createRes.json()) as MicroCMSHistory

  const detailRes = await fetch(`${cms.baseUrl}/history/${created.id}?depth=2`, {
    headers: cmsHeaders(cms.apiKey),
	})

  const full =
    detailRes.ok ? ((await detailRes.json()) as MicroCMSHistory) : created

  return c.json(historyFromCMS(full), 201)
})

// PATCH /api/history/:id
app.patch('/api/history/:id', async c => {
  const sessionUser = c.get('sessionUser')
  const id = c.req.param('id')
  const { location } = await c.req.json<{ isbn: string; location: string }>()

  const cms = requireCmsEnv(c.env, location)
  if (!cms) return c.json({ error: 'microCMS credentials are not configured for this location' }, 503)

  const existingRes = await fetch(`${cms.baseUrl}/history/${id}`, {
    headers: cmsHeaders(cms.apiKey),
  })
  if (!existingRes.ok) return c.json({ error: 'microCMS request failed' }, 502)
  const existing = (await existingRes.json()) as MicroCMSHistory
  const recordEmail = (existing.borrower_email ?? '').trim().toLowerCase()
  const sessionEmail = sessionUser.email.trim().toLowerCase()
  if (recordEmail !== sessionEmail) {
    return c.json({ error: 'forbidden' }, 403)
  }

  const res = await fetch(`${cms.baseUrl}/history/${id}`, {
    method: 'PATCH',
    headers: { ...cmsHeaders(cms.apiKey), 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_done: true, return_date: new Date().toISOString() }),
  })
  if (!res.ok) return c.json({ error: 'microCMS request failed' }, 502)
  return c.json({ ok: true })
})

function checkoutBorrowerSlackLabel(user: SessionUser): string {
  const name = user.name?.trim()
  return name ? name : user.email
}

// POST /api/notifications/slack
app.post('/api/notifications/slack', async c => {
  const sessionUser = c.get('sessionUser')
  if (!c.env.SLACK_WEBHOOK_URL) {
    // Slack未設定はサイレントスキップ
    return c.json({ ok: true, skipped: true })
  }

  const { type, location, book } = await c.req.json<{
    type: string
    location: string
    book: { title: string; author?: string; isbn: string }
  }>()

  const actionLabel: Record<string, string> = {
    checkout: '貸出',
    return: '返却',
    'new-book': '新規登録',
  }
  let text = `[${location}] 📚 ${actionLabel[type] ?? type}: ${book.title}${book.author ? ` / ${book.author}` : ''}`
  if (type === 'checkout') {
    text += ` · ${checkoutBorrowerSlackLabel(sessionUser)}`
  }

  const res = await fetch(c.env.SLACK_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
  if (!res.ok) return c.json({ error: 'Slack webhook failed' }, 502)
  return c.json({ ok: true })
})

export default app
