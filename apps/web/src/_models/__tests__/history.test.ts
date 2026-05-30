import { describe, expect, it } from 'vitest'

import { History } from '../history/history'
import { toHistoryId } from '../history/ids'

import { expectImmutableMutation } from './expectImmutableMutation'

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
  describe('返却', () => {
    it('markReturned は元を変更せず返却済みにする', () => {
      const before = sampleHistory()
      const returnedAt = new Date('2024-02-01')
      const after = History.markReturned(before, returnedAt)

      expectImmutableMutation(before, after, {
        assertBefore: (h) => {
          expect(h.isDone).toBe(false)
          expect(h.returnDate).toBeUndefined()
        },
        assertAfter: (h) => {
          expect(h.isDone).toBe(true)
          expect(h.returnDate).toBe(returnedAt)
        },
      })
    })
  })
})
