import { describe, expect, it } from 'vitest'

import { resolveBarcodeScannerKind } from './createBarcodeScanner'

describe('resolveBarcodeScannerKind', () => {
  it.each(['', '?scanner=unknown'])('%s は html5-qrcode を使う', (search) => {
    expect(resolveBarcodeScannerKind(search)).toBe('html5-qrcode')
  })

  it('scanner=quagga2 は Quagga2 を使う', () => {
    expect(resolveBarcodeScannerKind('?scanner=quagga2')).toBe('quagga2')
  })
})
