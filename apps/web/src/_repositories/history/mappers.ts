import { parseDateOrUndefined } from '@bookbook/utils'

import { toHistoryId } from '../../_models/history'

import type { HistoryDto } from '../../_models/history'

export type HistoryWire = HistoryDto

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
    availableCount: dto.availableCount,
    total: dto.total,
    checkoutDate: new Date(dto.checkoutDate),
    returnDate: parseDateOrUndefined(dto.returnDate),
    isDone: dto.isDone,
    borrowerEmail: dto.borrowerEmail ?? '',
    borrowerName: dto.borrowerName,
  }
}
