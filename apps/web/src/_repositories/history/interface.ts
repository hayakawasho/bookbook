import type { HistoryMetadata } from '../../_book/model'
import type { Location } from '../../_foundation/const'

export type HistoryQuery = {
  isDone?: boolean
}

/** 貸出履歴（mock / HTTP 実装を差し替え可能） */
export interface HistoryRepository {
  findMany(query: HistoryQuery, location: Location): HistoryMetadata[]
  createCheckout(isbn: string, location: Location): HistoryMetadata
  markReturned(historyId: string, isbn: string, location: Location): void
}
