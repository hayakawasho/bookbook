import { type BarcodeScannerAdapter, MockBarcodeScannerAdapter } from './barcodeScannerAdapter'
import { Html5QrcodeScannerAdapter } from './html5QrcodeScannerAdapter'

export type BarcodeScannerKind = 'html5-qrcode' | 'quagga2'

export function resolveBarcodeScannerKind(search: string): BarcodeScannerKind {
  return new URLSearchParams(search).get('scanner') === 'quagga2' ? 'quagga2' : 'html5-qrcode'
}

export function createBarcodeScanner(): BarcodeScannerAdapter {
  return typeof window !== 'undefined'
    ? new Html5QrcodeScannerAdapter()
    : new MockBarcodeScannerAdapter()
}
