import { defineEntity, type EntityWithId } from '@bookbook/utils'

import { toHistoryId } from './ids'

import type { HistoryPayload } from './payload'

export type History = EntityWithId<HistoryPayload, 'history'>

const factory = defineEntity(toHistoryId)<HistoryPayload>()

export const History = {
  create: factory.create,
  isReturned: (h: History): boolean => {
    return h.isDone
  },
  markReturned: (h: History, at: Date): History => {
    return History.create({ ...h, isDone: true, returnDate: at })
  },
}
