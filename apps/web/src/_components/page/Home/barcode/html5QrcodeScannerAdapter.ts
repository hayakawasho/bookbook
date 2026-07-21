import type { Html5Qrcode } from 'html5-qrcode'
import type { BarcodeScannerAdapter, ScanOptions } from './barcodeScannerAdapter'

/** mobile の Scanner と同様、978 から始まる ISBN（EAN-13）のみ検出扱いにする */
const ISBN_CODE_PREFIX = '978'

function isIsbnBarcode(raw: string): boolean {
  return raw.trim().startsWith(ISBN_CODE_PREFIX)
}

/** 初期バンドルから読取エンジンを外すため、カメラ起動時に動的 import する */
async function loadHtml5Qrcode() {
  return import('html5-qrcode')
}

export function createHtml5QrcodeScanConfig() {
  return {
    fps: 10,
    qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
      const width = Math.floor(viewfinderWidth * 0.9)
      const height = Math.min(Math.floor(width / 2), Math.floor(viewfinderHeight * 0.9))
      return { width, height }
    },
  }
}

async function stopAndClear(qr: Html5Qrcode): Promise<void> {
  try {
    if (qr.isScanning) {
      await qr.stop()
    }
  } catch {
    try {
      await qr.stop()
    } catch {
      /* ignore */
    }
  }
  try {
    qr.clear()
  } catch {
    /* ignore */
  }
}

/** `html5-qrcode` はこのファイルのみで import する */
export class Html5QrcodeScannerAdapter implements BarcodeScannerAdapter {
  private cameraQr: Html5Qrcode | null = null

  isSupported(): boolean {
    return (
      typeof document !== 'undefined' &&
      typeof navigator !== 'undefined' &&
      typeof navigator.mediaDevices?.getUserMedia === 'function'
    )
  }

  start(options: ScanOptions): void {
    this.startSafe(options)
  }

  stop(): void {
    this.disposeCamera()
  }

  private async disposeCamera(): Promise<void> {
    const qr = this.cameraQr
    this.cameraQr = null

    if (!qr) {
      return
    }
    await stopAndClear(qr)
  }

  private async startSafe(options: ScanOptions): Promise<void> {
    const elementId = options.elementId

    if (!elementId) {
      options.onError?.(new Error('ScanOptions.elementId が必要です'))
      return
    }

    await this.disposeCamera()

    let qr: Html5Qrcode
    try {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await loadHtml5Qrcode()
      qr = new Html5Qrcode(elementId, {
        verbose: false,
        formatsToSupport: [Html5QrcodeSupportedFormats.EAN_13],
      })
    } catch (e) {
      options.onError?.(e instanceof Error ? e : new Error(String(e)))
      return
    }
    this.cameraQr = qr

    try {
      await qr.start(
        { facingMode: 'environment' },
        createHtml5QrcodeScanConfig(),
        (decodedText) => {
          if (!isIsbnBarcode(decodedText)) {
            return
          }
          options.onDetected(decodedText.trim())
        },
        () => {},
      )
    } catch (e) {
      this.cameraQr = null
      await stopAndClear(qr)
      options.onError?.(e instanceof Error ? e : new Error(String(e)))
    }
  }
}
