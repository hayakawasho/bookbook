import { describe, expect, it } from 'vitest'

import { fitWithin } from './coverImageResize'

describe('fitWithin', () => {
  it('横長画像は幅を maxEdge に合わせて縮小する', () => {
    expect(fitWithin(1600, 800, 640)).toEqual({ width: 640, height: 320 })
  })

  it('縦長画像は高さを maxEdge に合わせて縮小する', () => {
    expect(fitWithin(800, 1600, 640)).toEqual({ width: 320, height: 640 })
  })

  it('maxEdge 以内であればそのまま返す', () => {
    expect(fitWithin(300, 200, 640)).toEqual({ width: 300, height: 200 })
  })

  it('端数は四捨五入する', () => {
    expect(fitWithin(1000, 333, 640)).toEqual({ width: 640, height: 213 })
  })

  it('極端なアスペクト比でも短辺が 1px 未満にならない', () => {
    const result = fitWithin(10000, 1, 640)

    expect(result.width).toBe(640)
    expect(result.height).toBeGreaterThanOrEqual(1)
  })
})
