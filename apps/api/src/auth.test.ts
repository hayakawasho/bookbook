import { describe, expect, it } from 'vitest'

import { isAllowedEmailIdentity, parseEmailAllowlist, signSession, verifySession } from './auth'

describe('parseEmailAllowlist', () => {
  it('許可ドメインと許可メールをカンマ区切りで正規化する', () => {
    expect(
      parseEmailAllowlist({
        ALLOWED_EMAIL_DOMAINS: 'A.COM, b.jp ,',
        ALLOWED_EMAILS: 'USER@GMAIL.COM, member@example.com ,',
      }),
    ).toEqual({
      domains: ['a.com', 'b.jp'],
      emails: ['user@gmail.com', 'member@example.com'],
    })
  })
})

describe('isAllowedEmailIdentity', () => {
  const domainAllowlist = { domains: ['example.com'], emails: [] }

  it('メールドメイン一致で許可', () => {
    expect(isAllowedEmailIdentity('x@example.com', true, undefined, domainAllowlist)).toBe(true)
  })

  it('hd が許可リストにあれば許可', () => {
    expect(isAllowedEmailIdentity('x@sub.example.com', true, 'example.com', domainAllowlist)).toBe(
      true,
    )
  })

  it('不一致なら拒否', () => {
    expect(isAllowedEmailIdentity('x@evil.com', true, undefined, domainAllowlist)).toBe(false)
  })

  it('email_verified が false なら拒否', () => {
    expect(isAllowedEmailIdentity('x@example.com', false, undefined, domainAllowlist)).toBe(false)
  })

  it('email_verified が undefined なら拒否', () => {
    expect(isAllowedEmailIdentity('x@example.com', undefined, undefined, domainAllowlist)).toBe(
      false,
    )
  })

  it('個別に許可したメールアドレスは許可する', () => {
    const allowlist = { domains: [], emails: ['owner@gmail.com'] }
    expect(isAllowedEmailIdentity('owner@gmail.com', true, undefined, allowlist)).toBe(true)
  })

  it('許可していない Gmail アドレスは拒否する', () => {
    const allowlist = { domains: [], emails: ['owner@gmail.com'] }
    expect(isAllowedEmailIdentity('other@gmail.com', true, undefined, allowlist)).toBe(false)
  })
})

describe('signSession / verifySession', () => {
  it('往復してユーザー情報が復元できる', async () => {
    const secret = '0123456789abcdef'
    const token = await signSession(
      secret,
      { email: 'a@example.com', name: 'A', picture: 'https://example.com/a.png' },
      3600,
    )
    const u = await verifySession(secret, token)
    expect(u).toEqual({
      email: 'a@example.com',
      name: 'A',
      hd: undefined,
      picture: 'https://example.com/a.png',
    })
  })

  it('picture を含まない既存セッションも復元できる', async () => {
    const secret = '0123456789abcdef'
    const token = await signSession(secret, { email: 'a@example.com' }, 3600)
    const u = await verifySession(secret, token)
    expect(u).toEqual({
      email: 'a@example.com',
      name: undefined,
      hd: undefined,
      picture: undefined,
    })
  })

  it('署名が違えば null', async () => {
    const token = await signSession('0123456789abcdef', { email: 'a@example.com' }, 3600)
    const u = await verifySession('fedcba9876543210', token)
    expect(u).toBeNull()
  })
})
