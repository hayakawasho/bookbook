import { type BarcodeScannerAdapter, MockBarcodeScannerAdapter } from './barcodeScannerAdapter'
import { Html5QrcodeScannerAdapter } from './html5QrcodeScannerAdapter'

export function createBarcodeScanner(): BarcodeScannerAdapter {
  return typeof window !== 'undefined'
    ? new Html5QrcodeScannerAdapter()
    : new MockBarcodeScannerAdapter()
}
