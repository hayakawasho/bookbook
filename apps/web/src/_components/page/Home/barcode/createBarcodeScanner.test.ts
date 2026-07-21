import { afterEach, describe, expect, it, vi } from 'vitest'

import { MockBarcodeScannerAdapter } from './barcodeScannerAdapter'
import { createBarcodeScanner, resolveBarcodeScannerKind } from './createBarcodeScanner'
import { Html5QrcodeScannerAdapter } from './html5QrcodeScannerAdapter'
import { Quagga2ScannerAdapter } from './quagga2ScannerAdapter'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('resolveBarcodeScannerKind', () => {
  it.each(['', '?scanner=unknown'])('%s は html5-qrcode を使う', (search) => {
    expect(resolveBarcodeScannerKind(search)).toBe('html5-qrcode')
  })

  it('scanner=quagga2 は Quagga2 を使う', () => {
    expect(resolveBarcodeScannerKind('?scanner=quagga2')).toBe('quagga2')
  })

  it('解決した種別の adapter を生成する', () => {
    expect(createBarcodeScanner('')).toBeInstanceOf(Html5QrcodeScannerAdapter)
    expect(createBarcodeScanner('?scanner=quagga2')).toBeInstanceOf(Quagga2ScannerAdapter)
  })

  it('サーバーでは mock adapter を生成する', () => {
    vi.stubGlobal('window', undefined)

    expect(createBarcodeScanner('?scanner=quagga2')).toBeInstanceOf(MockBarcodeScannerAdapter)
  })
})
