import { parseDateOrUndefined } from '@bookbook/utils'
import { toHistoryId } from '../../_models/history'
import type { HistoryDto } from '../../_models/history'

/** BFF が在庫フィールドを含めて返す場合があるため、mapping で書誌 + 履歴のみ取り出す */
export type HistoryWire = HistoryDto & {
  availableCount?: number
  total?: number
}

export function toHistoryInput(dto: HistoryWire) {
  return {
    id: toHistoryId(dto.historyId),
    isbn: dto.isbn,
    title: dto.title,
    author: dto.author,
    publisher: dto.publisher,
    publishedDate: parseDateOrUndefined(dto.publishedDate),
    cover: dto.cover,
    description: dto.description,
    checkoutDate: new Date(dto.checkoutDate),
    returnDate: parseDateOrUndefined(dto.returnDate),
    isDone: dto.isDone,
    borrowerEmail: dto.borrowerEmail ?? '',
    borrowerName: dto.borrowerName,
  }
}
