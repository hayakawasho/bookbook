import { describe, expect, it } from 'vitest'

import { normalizeIsbnBarcode } from './utils'

describe('normalizeIsbnBarcode', () => {
  it('ISBN-13として正しいEAN-13だけを受理する', () => {
    expect(normalizeIsbnBarcode('9784873119038')).toBe('9784873119038')
    expect(normalizeIsbnBarcode('9784873119039')).toBeNull()
    expect(normalizeIsbnBarcode('4901234567894')).toBeNull()
  })
})
