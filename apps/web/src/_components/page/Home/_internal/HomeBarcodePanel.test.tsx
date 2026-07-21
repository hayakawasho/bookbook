import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { HomeBarcodePanel } from './HomeBarcodePanel'

const baseProps = {
  cameraElementId: 'scanner',
  cameraOpen: true,
  isbnInput: '',
  notFound: false,
  onChangeIsbnInput: vi.fn(),
  onManualSearch: vi.fn(),
}

describe('HomeBarcodePanel', () => {
  it('Quagga2 では DOM のスキャン枠を表示する', () => {
    const { container } = render(<HomeBarcodePanel {...baseProps} showScanGuide />)

    expect(container.querySelector('.barcode-scan-guide')).toBeInTheDocument()
  })

  it('html5-qrcode ではライブラリ側のスキャン枠を使う', () => {
    const { container } = render(<HomeBarcodePanel {...baseProps} showScanGuide={false} />)

    expect(container.querySelector('.barcode-scan-guide')).not.toBeInTheDocument()
  })
})
