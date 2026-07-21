import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { HomeBarcodePanel } from './HomeBarcodePanel'

const baseProps = {
  cameraElementId: 'scanner',
  cameraOpen: true,
  isDetecting: false,
  isbnInput: '',
  notFound: false,
  onChangeIsbnInput: vi.fn(),
  onManualSearch: vi.fn(),
}

describe('HomeBarcodePanel', () => {
  it('カメラ表示中は DOM のスキャン枠を表示する', () => {
    const { container } = render(<HomeBarcodePanel {...baseProps} />)

    expect(container.querySelector('.barcode-scan-guide')).toBeInTheDocument()
  })

  it('カメラ非表示中は DOM のスキャン枠を表示しない', () => {
    const { container } = render(<HomeBarcodePanel {...baseProps} cameraOpen={false} />)

    expect(container.querySelector('.barcode-scan-guide')).not.toBeInTheDocument()
  })

  it('バーコード候補の検出中はスキャン枠を反応させる', () => {
    const { container } = render(<HomeBarcodePanel {...baseProps} isDetecting />)

    expect(container.querySelector('.barcode-scan-guide')).toHaveClass('is-detecting')
  })
})
