import { describe, expect, it } from 'vitest'

import { readVolumeFromRaw } from './appPreferencesStorage'

describe('readVolumeFromRaw', () => {
  it('数値文字列をそのまま返す', () => {
    expect(readVolumeFromRaw('70')).toBe(70)
  })

  it('範囲外の値は 0-100 に clamp する', () => {
    expect(readVolumeFromRaw('150')).toBe(100)
    expect(readVolumeFromRaw('-10')).toBe(0)
  })

  it('不正な値は null を返す', () => {
    expect(readVolumeFromRaw('abc')).toBeNull()
    expect(readVolumeFromRaw(null)).toBeNull()
  })
})
