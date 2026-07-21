import { beforeEach, describe, expect, it, vi } from 'vitest'

const quagga = vi.hoisted(() => ({
  init: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  onDetected: vi.fn(),
  offDetected: vi.fn(),
}))

vi.mock('@ericblade/quagga2', () => ({ default: quagga }))

import { Quagga2ScannerAdapter } from './quagga2ScannerAdapter'

describe('Quagga2ScannerAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    quagga.init.mockImplementation((_config, callback) => {
      callback?.(null)
      return Promise.resolve()
    })
    quagga.stop.mockResolvedValue(undefined)
  })

  it('EAN-13 だけを広めの領域で検出する', async () => {
    const element = document.createElement('div')
    element.id = 'scanner'
    document.body.append(element)
    const onDetected = vi.fn()
    const adapter = new Quagga2ScannerAdapter()

    adapter.start({ elementId: element.id, onDetected })

    await vi.waitFor(() => expect(quagga.start).toHaveBeenCalledOnce())
    expect(quagga.init).toHaveBeenCalledWith(
      expect.objectContaining({
        inputStream: expect.objectContaining({
          type: 'LiveStream',
          target: element,
          area: { top: '20%', right: '10%', bottom: '20%', left: '10%' },
        }),
        decoder: { readers: ['ean_reader'] },
        canvas: { createOverlay: false },
        locate: true,
        frequency: 10,
      }),
      expect.any(Function),
    )

    const detectionHandler = quagga.onDetected.mock.calls[0]?.[0]
    detectionHandler?.({ codeResult: { code: '9784873119038' } })
    expect(onDetected).toHaveBeenCalledWith('9784873119038')
  })

  it('検出値が文字列でない場合は無視する', async () => {
    const element = document.createElement('div')
    element.id = 'scanner'
    document.body.append(element)
    const onDetected = vi.fn()
    const adapter = new Quagga2ScannerAdapter()

    adapter.start({ elementId: element.id, onDetected })
    await vi.waitFor(() => expect(quagga.onDetected).toHaveBeenCalledOnce())

    const detectionHandler = quagga.onDetected.mock.calls[0]?.[0]
    detectionHandler?.({ codeResult: { code: null } })
    expect(onDetected).not.toHaveBeenCalled()
  })

  it('対象要素がない場合はエラーを通知する', async () => {
    const onError = vi.fn()

    new Quagga2ScannerAdapter().start({
      elementId: 'missing-scanner',
      onDetected: vi.fn(),
      onError,
    })

    await vi.waitFor(() => expect(onError).toHaveBeenCalledOnce())
    expect(quagga.init).not.toHaveBeenCalled()
  })

  it('停止時に検出 handler とカメラを解放する', async () => {
    const element = document.createElement('div')
    element.id = 'scanner'
    document.body.append(element)
    const adapter = new Quagga2ScannerAdapter()

    adapter.start({ elementId: element.id, onDetected: vi.fn() })
    await vi.waitFor(() => expect(quagga.start).toHaveBeenCalledOnce())
    const detectionHandler = quagga.onDetected.mock.calls[0]?.[0]

    adapter.stop()

    await vi.waitFor(() => expect(quagga.stop).toHaveBeenCalledOnce())
    expect(quagga.offDetected).toHaveBeenCalledWith(detectionHandler)
  })
})
