import type { Location } from '../../_foundation/const'
import type { History } from '../../_models/history'

export type HistoryQuery = {
  isDone?: boolean
}

/** 貸出履歴（mock / HTTP 実装を差し替え可能） */
export interface HistoryRepository {
  findMany(query: HistoryQuery, location: Location): Promise<History[]>
  createItem(isbn: string, location: Location): Promise<History>
  returnItem(historyId: string, location: Location): Promise<void>
  undoReturnItem(historyId: string, location: Location): Promise<void>
}
