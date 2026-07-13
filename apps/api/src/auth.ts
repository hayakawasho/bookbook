/** Google OAuth / HMAC 署名セッション（フェーズ2） */

export const SESSION_COOKIE_NAME = 'bookbook_session'
export const CSRF_COOKIE_NAME = 'bookbook_oauth_state'

const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7 // 7 days
const CSRF_MAX_AGE_SEC = 600 // 10 minutes

export type SessionUser = {
  email: string
  name?: string
  hd?: string
  picture?: string
}

type SessionPayloadV1 = {
  v: 1
  email: string
  name?: string
  hd?: string
  picture?: string
  exp: number
}

function parseAllowedList(raw: string | undefined): string[] {
  if (!raw?.trim()) {
    return []
  }

  return raw
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
}

export type EmailAllowlist = {
  domains: string[]
  emails: string[]
}

type EmailAllowlistSource = {
  ALLOWED_EMAIL_DOMAINS?: string
  ALLOWED_EMAILS?: string
}

export function parseEmailAllowlist(source: EmailAllowlistSource): EmailAllowlist {
  return {
    domains: parseAllowedList(source.ALLOWED_EMAIL_DOMAINS),
    emails: parseAllowedList(source.ALLOWED_EMAILS),
  }
}

export function isEmailAllowlistConfigured(allowlist: EmailAllowlist): boolean {
  return allowlist.domains.length > 0 || allowlist.emails.length > 0
}

/** 個別メール、Workspace の hd、またはメールドメインが許可リストに含まれるか */
export function isAllowedEmailIdentity(
  email: string,
  emailVerified: boolean | undefined,
  hd: string | undefined,
  allowlist: EmailAllowlist,
): boolean {
  if (!isEmailAllowlistConfigured(allowlist)) {
    return false
  }

  if (emailVerified !== true) {
    return false
  }

  const normalizedEmail = email.trim().toLowerCase()
  const at = normalizedEmail.lastIndexOf('@')
  if (at <= 0) {
    return false
  }

  if (allowlist.emails.includes(normalizedEmail)) {
    return true
  }

  const domain = normalizedEmail.slice(at + 1)
  if (allowlist.domains.includes(domain)) {
    return true
  }

  if (hd && allowlist.domains.includes(hd.toLowerCase())) {
    return true
  }

  return false
}

/** OAuth 時に確認済みのメールアドレスを持つセッションユーザーの許可を再評価する */
export function isAllowedSessionUser(user: SessionUser, allowlist: EmailAllowlist): boolean {
  return isAllowedEmailIdentity(user.email, true, user.hd, allowlist)
}

function utf8(s: string): Uint8Array {
  return new TextEncoder().encode(s)
}

function fromUtf8(b: Uint8Array): string {
  return new TextDecoder().decode(b)
}

function base64urlEncode(bytes: Uint8Array): string {
  let s = ''
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]!)
  const b64 = btoa(s)
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64urlDecode(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4))
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + pad
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    utf8(secret) as BufferSource,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

export async function signSession(
  secret: string,
  user: SessionUser,
  maxAgeSec: number,
): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + maxAgeSec
  const payload: SessionPayloadV1 = {
    v: 1,
    email: user.email,
    name: user.name,
    hd: user.hd,
    picture: user.picture,
    exp,
  }
  const payloadStr = JSON.stringify(payload)
  const key = await importHmacKey(secret)
  const sig = await crypto.subtle.sign('HMAC', key, utf8(payloadStr) as BufferSource)
  return `${base64urlEncode(utf8(payloadStr))}.${base64urlEncode(new Uint8Array(sig))}`
}

export async function verifySession(secret: string, token: string): Promise<SessionUser | null> {
  const dot = token.lastIndexOf('.')
  if (dot <= 0) {
    return null
  }

  const payloadB64 = token.slice(0, dot)
  const sigB64 = token.slice(dot + 1)
  let payloadStr: string
  try {
    payloadStr = fromUtf8(base64urlDecode(payloadB64))
  } catch {
    return null
  }
  let payload: SessionPayloadV1
  try {
    payload = JSON.parse(payloadStr) as SessionPayloadV1
  } catch {
    return null
  }
  if (payload.v !== 1 || typeof payload.email !== 'string' || typeof payload.exp !== 'number') {
    return null
  }

  if (payload.exp < Math.floor(Date.now() / 1000)) {
    return null
  }

  let sig: Uint8Array
  try {
    sig = base64urlDecode(sigB64)
  } catch {
    return null
  }
  const key = await importHmacKey(secret)
  const ok = await crypto.subtle.verify(
    'HMAC',
    key,
    sig as BufferSource,
    utf8(payloadStr) as BufferSource,
  )
  if (!ok) {
    return null
  }

  return { email: payload.email, name: payload.name, hd: payload.hd, picture: payload.picture }
}

export function requestUsesHttps(urlStr: string): boolean {
  try {
    return new URL(urlStr).protocol === 'https:'
  } catch {
    return false
  }
}

export { CSRF_MAX_AGE_SEC, SESSION_MAX_AGE_SEC }
