import type { BookMetadata } from './book'

export type HistoryMetadata = BookMetadata & {
  historyId: string
  checkoutDate: Date
  returnDate?: Date
  isDone: boolean
}
