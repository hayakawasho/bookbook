/** Google OAuth / HMAC 署名セッション（フェーズ2） */

export const SESSION_COOKIE_NAME = 'bookbook_session'
export const CSRF_COOKIE_NAME = 'bookbook_oauth_state'

const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7 // 7 days
const CSRF_MAX_AGE_SEC = 600 // 10 minutes

export type SessionUser = {
  email: string
  name?: string
  hd?: string
}

type SessionPayloadV1 = {
  v: 1
  email: string
  name?: string
  hd?: string
  exp: number
}

export function parseAllowedDomains(raw: string | undefined): string[] {
  if (!raw?.trim()) return []
  return raw.split(',').map(d => d.trim().toLowerCase()).filter(Boolean)
}

/** Workspace の hd とメールドメインのどちらかが許可リストに含まれるか */
export function isAllowedWorkspaceUser(
  email: string,
  emailVerified: boolean | undefined,
  hd: string | undefined,
  allowedDomains: string[],
): boolean {
  if (allowedDomains.length === 0) return false
  if (emailVerified === false) return false
  const at = email.lastIndexOf('@')
  if (at <= 0) return false
  const domain = email.slice(at + 1).toLowerCase()
  if (allowedDomains.includes(domain)) return true
  if (hd && allowedDomains.includes(hd.toLowerCase())) return true
  return false
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

export async function signSession(secret: string, user: SessionUser, maxAgeSec: number): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + maxAgeSec
  const payload: SessionPayloadV1 = {
    v: 1,
    email: user.email,
    name: user.name,
    hd: user.hd,
    exp,
  }
  const payloadStr = JSON.stringify(payload)
  const key = await importHmacKey(secret)
  const sig = await crypto.subtle.sign('HMAC', key, utf8(payloadStr) as BufferSource)
  return `${base64urlEncode(utf8(payloadStr))}.${base64urlEncode(new Uint8Array(sig))}`
}

export async function verifySession(secret: string, token: string): Promise<SessionUser | null> {
  const dot = token.lastIndexOf('.')
  if (dot <= 0) return null
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
  if (payload.v !== 1 || typeof payload.email !== 'string' || typeof payload.exp !== 'number') return null
  if (payload.exp < Math.floor(Date.now() / 1000)) return null

  let sig: Uint8Array
  try {
    sig = base64urlDecode(sigB64)
  } catch {
    return null
  }
  const key = await importHmacKey(secret)
  const ok = await crypto.subtle.verify('HMAC', key, sig as BufferSource, utf8(payloadStr) as BufferSource)
  if (!ok) return null

  return { email: payload.email, name: payload.name, hd: payload.hd }
}

export function requestUsesHttps(urlStr: string): boolean {
  try {
    return new URL(urlStr).protocol === 'https:'
  } catch {
    return false
  }
}

export { SESSION_MAX_AGE_SEC, CSRF_MAX_AGE_SEC }
