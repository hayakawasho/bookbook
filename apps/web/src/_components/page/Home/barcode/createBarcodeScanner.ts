import { type BarcodeScannerAdapter, MockBarcodeScannerAdapter } from './barcodeScannerAdapter'
import { Quagga2ScannerAdapter } from './quagga2ScannerAdapter'

export function createBarcodeScanner(): BarcodeScannerAdapter {
  if (typeof window === 'undefined') {
    return new MockBarcodeScannerAdapter()
  }

  return new Quagga2ScannerAdapter()
}
