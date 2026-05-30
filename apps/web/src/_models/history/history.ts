import { defineEntity } from '../defineEntity'
import type { EntityWithId } from '../types'
import { toHistoryId } from './ids'

type HistoryPayload = {
  isbn: string
  title: string
  author?: string
  publisher?: string
  publishedDate?: Date
  cover: { src?: string }
  description?: string
  checkoutDate: Date
  returnDate?: Date
  isDone: boolean
  borrowerEmail: string
  borrowerName?: string
}

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
