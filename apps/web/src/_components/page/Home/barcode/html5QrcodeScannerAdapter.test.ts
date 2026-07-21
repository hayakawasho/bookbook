import { describe, expect, it } from 'vitest'

import { createHtml5QrcodeScanConfig } from './html5QrcodeScannerAdapter'

describe('createHtml5QrcodeScanConfig', () => {
  it('10 FPS で映像幅の 90% を解析する', () => {
    const config = createHtml5QrcodeScanConfig()

    expect(config.fps).toBe(10)
    expect(config.qrbox(320, 240)).toEqual({ width: 288, height: 144 })
    expect(config.qrbox(430, 320)).toEqual({ width: 387, height: 193 })
  })
})
