import { afterEach, describe, expect, it, vi } from 'vitest'

import { MockBarcodeScannerAdapter } from './barcodeScannerAdapter'
import { createBarcodeScanner } from './createBarcodeScanner'
import { Quagga2ScannerAdapter } from './quagga2ScannerAdapter'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('createBarcodeScanner', () => {
  it('ブラウザでは Quagga2 adapter を生成する', () => {
    expect(createBarcodeScanner()).toBeInstanceOf(Quagga2ScannerAdapter)
  })

  it('サーバーでは mock adapter を生成する', () => {
    vi.stubGlobal('window', undefined)

    expect(createBarcodeScanner()).toBeInstanceOf(MockBarcodeScannerAdapter)
  })
})
