import type { BookSnapshot } from '../book/payload'

export type HistoryCheckoutPayload = {
  checkoutDate: Date
  returnDate?: Date
  isDone: boolean
  borrowerEmail: string
  borrowerName?: string
}

/** Book のスナップショット + 貸出レコード固有フィールド */
export type HistoryPayload = BookSnapshot & HistoryCheckoutPayload
