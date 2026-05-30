import type { BookBibliographyDto } from '../book/dto'

export type HistoryDto = BookBibliographyDto & {
  historyId: string
  checkoutDate: string
  returnDate?: string
  isDone: boolean
  borrowerEmail?: string
  borrowerName?: string
}
