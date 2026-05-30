import { describe, expect, expectTypeOf, it } from 'vitest'

import { Book } from '../book/book'
import { toBookId } from '../book/ids'
import { toHistoryId } from '../history/ids'

function sampleBook(overrides: Partial<Parameters<typeof Book.create>[0]> = {}) {
  return Book.create({
    id: toBookId('9784873119038'),
    title: 'リーダブルコード',
    cover: {},
    availableCount: 2,
    total: 2,
    ...overrides,
  })
}

describe('Book', () => {
  it('checkout returns a new book without mutating the original', () => {
    const before = sampleBook()
    const after = Book.checkout(before)

    expect(after).not.toBe(before)
    expect(before.availableCount).toBe(2)
    expect(after.availableCount).toBe(1)
    expect(after.id).toBe(before.id)
  })

  it('isBorrowable reflects stock after checkout', () => {
    const before = sampleBook()
    expect(Book.isBorrowable(before)).toBe(true)

    const once = Book.checkout(before)
    expect(Book.isBorrowable(once)).toBe(true)

    const twice = Book.checkout(once)
    expect(Book.isBorrowable(twice)).toBe(false)
  })

  it('throws when checking out with zero available stock', () => {
    const book = sampleBook({ availableCount: 0, total: 1 })
    expect(() => Book.checkout(book)).toThrow('在庫がありません')
  })

  it('throws when returning while all copies are already available', () => {
    const book = sampleBook({ availableCount: 2, total: 2 })
    expect(() => Book.return(book)).toThrow('全冊が在庫済みです')
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
