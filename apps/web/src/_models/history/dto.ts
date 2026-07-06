import type { BookDto } from '../book/dto'

export type HistoryDto = BookDto & {
  historyId: string
  checkoutDate: string
  returnDate?: string
  isDone: boolean
  borrowerEmail?: string
  borrowerName?: string
}
