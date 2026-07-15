import { describe, expect, it } from 'vitest'

import { History } from '../history/history'
import { toHistoryId } from '../history/ids'
import { expectImmutableMutation } from '../testing/expectImmutableMutation'

import { Book } from './book'
import { toBookId } from './ids'

function sampleBook(overrides: Partial<Parameters<typeof Book.create>[0]> = {}) {
  return Book.create({
    id: toBookId('9784873119038'),
    title: 'リーダブルコード',
    cover: {},
    availableCount: 2,
    total: 3,
    ...overrides,
  })
}

describe('Book', () => {
  describe('在庫の変更', () => {
    it('checkout と return は元を変更せず在庫を正しく増減する', () => {
      const before = sampleBook()
      const afterCheckout = Book.checkout(before)

      expectImmutableMutation(before, afterCheckout, {
        assertBefore: (b) => expect(b.availableCount).toBe(2),
        assertAfter: (b) => expect(b.availableCount).toBe(1),
      })

      const afterReturn = Book.return(afterCheckout)

      expectImmutableMutation(afterCheckout, afterReturn, {
        assertBefore: (b) => expect(b.availableCount).toBe(1),
        assertAfter: (b) => expect(b.availableCount).toBe(2),
      })
    })
  })

  describe('ガード節', () => {
    it('在庫 0 のとき checkout するとエラーになる', () => {
      const book = sampleBook({ availableCount: 0, total: 1 })
      expect(() => Book.checkout(book)).toThrow('在庫がありません')
    })

    it('全冊が在庫済みのとき return するとエラーになる', () => {
      const book = sampleBook({ availableCount: 2, total: 2 })
      expect(() => Book.return(book)).toThrow('全冊が在庫済みです')
    })
  })

  describe('スナップショット', () => {
    it('toSnapshot / fromHistory で Book と History の book 部分を行き来できる', () => {
      const book = sampleBook()
      const history = History.create({
        ...Book.toSnapshot(book),
        id: toHistoryId('history-1'),
        checkoutDate: new Date('2024-01-15'),
        isDone: false,
        borrowerEmail: 'user@example.com',
      })

      expect(Book.fromHistory(history)).toEqual(book)
    })
  })
})
