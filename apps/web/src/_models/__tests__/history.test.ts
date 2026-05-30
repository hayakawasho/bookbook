import { describe, expect, expectTypeOf, it } from 'vitest'

import { toBookId } from '../book/ids'
import { History } from '../history/history'
import { toHistoryId } from '../history/ids'

function sampleHistory(overrides: Partial<Parameters<typeof History.create>[0]> = {}) {
  return History.create({
    id: toHistoryId('1'),
    isbn: '9784873119038',
    title: 'リーダブルコード',
    cover: {},
    checkoutDate: new Date('2024-01-15'),
    isDone: false,
    borrowerEmail: 'user@example.com',
    ...overrides,
  })
}

describe('History', () => {
  it('markReturned returns a new history without mutating the original', () => {
    const before = sampleHistory()
    const returnedAt = new Date('2024-02-01')
    const after = History.markReturned(before, returnedAt)

    expect(after).not.toBe(before)
    expect(before.isDone).toBe(false)
    expect(before.returnDate).toBeUndefined()
    expect(after.isDone).toBe(true)
    expect(after.returnDate).toBe(returnedAt)
    expect(after.id).toBe(before.id)
  })

  it('isReturned reflects isDone', () => {
    const active = sampleHistory({ isDone: false })
    const done = sampleHistory({ isDone: true, returnDate: new Date() })
    expect(History.isReturned(active)).toBe(false)
    expect(History.isReturned(done)).toBe(true)
  })

  it('BookId and HistoryId are not interchangeable', () => {
    const bookId = toBookId('9784873119038')
    const historyId = toHistoryId('1')
    expectTypeOf(bookId).toEqualTypeOf<typeof bookId>()
    expectTypeOf(historyId).toEqualTypeOf<typeof historyId>()
    // @ts-expect-error BrandId<"book"> and BrandId<"history"> are not assignable
    const _: typeof historyId = bookId
  })
})
