import { describe, expect, it } from 'vitest'

import { validateStockTransition } from './stockTransition'

describe('validateStockTransition', () => {
  it('在庫追加: total +1, available +1', () => {
    expect(
      validateStockTransition({ available_count: 2, total: 3 }, { availableCount: 3, total: 4 }),
    ).toEqual({ ok: true })
  })

  it('貸出: available -1', () => {
    expect(
      validateStockTransition({ available_count: 2, total: 3 }, { availableCount: 1, total: 3 }),
    ).toEqual({ ok: true })
  })

  it('返却: available +1', () => {
    expect(
      validateStockTransition({ available_count: 1, total: 3 }, { availableCount: 2, total: 3 }),
    ).toEqual({ ok: true })
  })

  it('在庫 0 の貸出は拒否', () => {
    expect(
      validateStockTransition({ available_count: 0, total: 2 }, { availableCount: -1, total: 2 }),
    ).toEqual({ ok: false, reason: 'invalid stock counts' })
  })

  it('全冊在庫の返却は拒否', () => {
    expect(
      validateStockTransition({ available_count: 2, total: 2 }, { availableCount: 3, total: 2 }),
    ).toEqual({ ok: false, reason: 'invalid stock counts' })
  })

  it('許可されない差分は拒否', () => {
    expect(
      validateStockTransition({ available_count: 2, total: 3 }, { availableCount: 0, total: 3 }),
    ).toEqual({ ok: false, reason: 'invalid stock transition' })
  })
})
