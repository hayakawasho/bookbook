export type ScanOptions = {
  /** Phase 3 以降でカメラプレビューをマウントする要素の id */
  elementId?: string
  onDetected: (isbn: string) => void
  onError?: (error: Error) => void
}

/** バーコード読み取り（実装ライブラリは adapter 直下に閉じる） */
export interface BarcodeScannerAdapter {
  isSupported(): boolean
  start(options: ScanOptions): void
  stop(): void
  scanFile(file: File): Promise<string | null>
}

export class MockBarcodeScannerAdapter implements BarcodeScannerAdapter {
  isSupported(): boolean {
    return false // Phase 3 で html5-qrcode 等の実装に差し替える
  }

  start(_options: ScanOptions): void {}

  stop(): void {}

  scanFile(_file: File): Promise<string | null> {
    return Promise.resolve(null)
  }
}
