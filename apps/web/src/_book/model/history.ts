import type { BookMetadata } from './book'

export type HistoryMetadata = BookMetadata & {
  historyId: string
  checkoutDate: Date
  returnDate?: Date
  isDone: boolean
  /** 貸出時のログインユーザー（microCMS の borrower_email） */
  borrowerEmail: string
  /** 貸出時の表示名（microCMS の borrower_name、未設定のときは省略可） */
  borrowerName?: string
}
