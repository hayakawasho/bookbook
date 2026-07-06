import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'

import type { BarcodeScannerAdapter, ScanOptions } from './barcodeScannerAdapter'

const EAN_13_ONLY: Html5QrcodeSupportedFormats[] = [Html5QrcodeSupportedFormats.EAN_13]

/** 画像ファイル読取用の非表示スロット（カメラ用要素と競合しない） */
const FILE_SLOT_ID = 'bookbook-html5qrcode-file-slot'

/** mobile の Scanner と同様、978 から始まる ISBN（EAN-13）のみ検出扱いにする */
const ISBN_CODE_PREFIX = '978'

function isIsbnBarcode(raw: string): boolean {
  return raw.trim().startsWith(ISBN_CODE_PREFIX)
}

function barcodeDecoderConfig(verbose: boolean) {
  return { verbose, formatsToSupport: EAN_13_ONLY }
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

  async scanFile(file: File): Promise<string | null> {
    await this.disposeCamera()

    let slot = document.getElementById(FILE_SLOT_ID)

    if (!slot) {
      slot = document.createElement('div')
      slot.id = FILE_SLOT_ID
      slot.setAttribute(
        'style',
        'position:fixed;width:0;height:0;overflow:hidden;opacity:0;pointer-events:none;top:0;left:0;',
      )
      document.body.appendChild(slot)
    }

    const qr = new Html5Qrcode(FILE_SLOT_ID, barcodeDecoderConfig(false))

    try {
      const text = await qr.scanFile(file, false)
      await stopAndClear(qr)
      return isIsbnBarcode(text) ? text.trim() : null
    } catch {
      await stopAndClear(qr)
      return null
    }
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

    const qr = new Html5Qrcode(elementId, barcodeDecoderConfig(false))
    this.cameraQr = qr

    try {
      await qr.start(
        { facingMode: 'environment' },
        {
          fps: 8,
          qrbox: () => ({
            width: 287,
            height: 101,
          }),
        },
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
