import type {
  QuaggaJSConfigObject,
  QuaggaJSResultCallbackFunction,
  QuaggaJSStatic,
} from '@ericblade/quagga2'
import type { BarcodeScannerAdapter, ScanOptions } from './barcodeScannerAdapter'

async function loadQuagga2(): Promise<QuaggaJSStatic> {
  const module = await import('@ericblade/quagga2')
  return module.default
}

function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value))
}

function createConfig(target: HTMLElement): QuaggaJSConfigObject {
  return {
    inputStream: {
      type: 'LiveStream',
      target,
      constraints: {
        facingMode: 'environment',
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      area: { top: '20%', right: '10%', bottom: '20%', left: '10%' },
      willReadFrequently: true,
    },
    decoder: { readers: ['ean_reader'] },
    canvas: { createOverlay: false },
    locator: { halfSample: false, patchSize: 'medium' },
    locate: true,
    frequency: 10,
  }
}

function initialize(quagga: QuaggaJSStatic, config: QuaggaJSConfigObject): Promise<void> {
  return new Promise((resolve, reject) => {
    void quagga.init(config, (error) => {
      if (error) {
        reject(toError(error))
        return
      }
      resolve()
    })
  })
}

export class Quagga2ScannerAdapter implements BarcodeScannerAdapter {
  private quagga: QuaggaJSStatic | null = null
  private detectedHandler: QuaggaJSResultCallbackFunction | null = null
  private generation = 0

  isSupported(): boolean {
    return (
      typeof document !== 'undefined' &&
      typeof navigator !== 'undefined' &&
      typeof navigator.mediaDevices?.getUserMedia === 'function'
    )
  }

  start(options: ScanOptions): void {
    const generation = ++this.generation
    void this.startSafe(options, generation)
  }

  stop(): void {
    this.generation += 1
    void this.stopSafe()
  }

  private async startSafe(options: ScanOptions, generation: number): Promise<void> {
    try {
      await this.stopSafe()

      const target = options.elementId ? document.getElementById(options.elementId) : null
      if (!target) {
        throw new Error('ScanOptions.elementId に対応する要素が必要です')
      }

      const quagga = await loadQuagga2()
      if (generation !== this.generation) {
        return
      }

      await initialize(quagga, createConfig(target))
      if (generation !== this.generation) {
        await quagga.stop()
        return
      }

      const detectedHandler: QuaggaJSResultCallbackFunction = (result) => {
        const code = result.codeResult?.code
        if (typeof code === 'string') {
          options.onDetected(code.trim())
        }
      }

      this.quagga = quagga
      this.detectedHandler = detectedHandler
      quagga.onDetected(detectedHandler)
      quagga.start()
    } catch (error) {
      if (generation === this.generation) {
        options.onError?.(toError(error))
      }
    }
  }

  private async stopSafe(): Promise<void> {
    const quagga = this.quagga
    const detectedHandler = this.detectedHandler
    this.quagga = null
    this.detectedHandler = null

    if (!quagga) {
      return
    }
    if (detectedHandler) {
      quagga.offDetected(detectedHandler)
    }
    await quagga.stop()
  }
}
