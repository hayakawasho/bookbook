import { describe, expect, it } from 'vitest'

import { resolveAppConfig } from './config'

describe('resolveAppConfig', () => {
  it('VITE_APP_PROFILE=production を解決する', () => {
    expect(resolveAppConfig({ VITE_APP_PROFILE: 'production' }).profile).toBe('production')
  })

  it('VITE_APP_PROFILE=mock を解決する', () => {
    expect(resolveAppConfig({ VITE_APP_PROFILE: 'mock' }).profile).toBe('mock')
  })

  it('dev では未設定を mock にフォールバックする', () => {
    expect(resolveAppConfig({}).profile).toBe('mock')
    expect(resolveAppConfig({ PROD: false }).profile).toBe('mock')
  })

  it('本番ビルドで未設定なら throw する', () => {
    expect(() => resolveAppConfig({ PROD: true })).toThrow(/must be set/)
  })

  it('不明値は throw する', () => {
    expect(() => resolveAppConfig({ VITE_APP_PROFILE: 'prod' })).toThrow(/Invalid VITE_APP_PROFILE/)
    expect(() => resolveAppConfig({ VITE_APP_PROFILE: 'prod', PROD: true })).toThrow(
      /Invalid VITE_APP_PROFILE/,
    )
  })
})
