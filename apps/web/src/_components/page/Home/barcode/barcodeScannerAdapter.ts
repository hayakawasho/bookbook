export type ScanOptions = {
  /** カメラプレビューをマウントする要素の id */
  elementId?: string
  onDetected: (isbn: string) => void
  onError?: (error: Error) => void
}

/** バーコード読み取り（実装ライブラリは `html5QrcodeScannerAdapter` のみで import する） */
export interface BarcodeScannerAdapter {
  isSupported(): boolean
  start(options: ScanOptions): void
  stop(): void
}

export class MockBarcodeScannerAdapter implements BarcodeScannerAdapter {
  isSupported(): boolean {
    return false
  }

  start(_options: ScanOptions): void {}

  stop(): void {}
}
