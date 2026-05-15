import { describe, expect, it } from 'vitest'
import {
  isAllowedWorkspaceUser,
  parseAllowedDomains,
  signSession,
  verifySession,
} from './auth'

describe('parseAllowedDomains', () => {
  it('カンマ区切りを正規化する', () => {
    expect(parseAllowedDomains('A.COM, b.jp ,')).toEqual(['a.com', 'b.jp'])
  })
})

describe('isAllowedWorkspaceUser', () => {
  const allowed = ['example.com']

  it('メールドメイン一致で許可', () => {
    expect(isAllowedWorkspaceUser('x@example.com', true, undefined, allowed)).toBe(true)
  })

  it('hd が許可リストにあれば許可', () => {
    expect(isAllowedWorkspaceUser('x@sub.example.com', true, 'example.com', allowed)).toBe(true)
  })

  it('不一致なら拒否', () => {
    expect(isAllowedWorkspaceUser('x@evil.com', true, undefined, allowed)).toBe(false)
  })

  it('email_verified が false なら拒否', () => {
    expect(isAllowedWorkspaceUser('x@example.com', false, undefined, allowed)).toBe(false)
  })
})

describe('signSession / verifySession', () => {
  it('往復してユーザー情報が復元できる', async () => {
    const secret = '0123456789abcdef'
    const token = await signSession(secret, { email: 'a@example.com', name: 'A' }, 3600)
    const u = await verifySession(secret, token)
    expect(u).toEqual({ email: 'a@example.com', name: 'A', hd: undefined })
  })

  it('署名が違えば null', async () => {
    const token = await signSession(
      '0123456789abcdef',
      { email: 'a@example.com' },
      3600,
    )
    const u = await verifySession('fedcba9876543210', token)
    expect(u).toBeNull()
  })
})
