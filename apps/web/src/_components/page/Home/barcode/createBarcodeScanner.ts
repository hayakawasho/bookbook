import { type BarcodeScannerAdapter, MockBarcodeScannerAdapter } from './barcodeScannerAdapter'
import { Html5QrcodeScannerAdapter } from './html5QrcodeScannerAdapter'
import { Quagga2ScannerAdapter } from './quagga2ScannerAdapter'

export type BarcodeScannerKind = 'html5-qrcode' | 'quagga2'

export function resolveBarcodeScannerKind(search: string): BarcodeScannerKind {
  return new URLSearchParams(search).get('scanner') === 'quagga2' ? 'quagga2' : 'html5-qrcode'
}

export function createBarcodeScanner(
  search = typeof window === 'undefined' ? '' : window.location.search,
): BarcodeScannerAdapter {
  if (typeof window === 'undefined') {
    return new MockBarcodeScannerAdapter()
  }

  return resolveBarcodeScannerKind(search) === 'quagga2'
    ? new Quagga2ScannerAdapter()
    : new Html5QrcodeScannerAdapter()
}
