import { parseDateOrUndefined } from '@bookbook/utils'

import { toBookId } from '../../_models/book'

import type { BookDto, ExternalBookDto } from '../../_models/book'
import type { ExternalBookInfo } from '../../_usecases/book/ports'

export function toBookInput(dto: BookDto) {
  return {
    id: toBookId(dto.isbn),
    title: dto.title,
    author: dto.author,
    publisher: dto.publisher,
    publishedDate: parseDateOrUndefined(dto.publishedDate),
    cover: dto.cover,
    description: dto.description,
    pageCount: dto.pageCount,
    availableCount: dto.availableCount,
    total: dto.total,
  }
}

export function toExternalBookInfo(dto: ExternalBookDto): ExternalBookInfo {
  return {
    isbn: dto.isbn,
    title: dto.title,
    author: dto.author,
    publisher: dto.publisher,
    publishedDate: parseDateOrUndefined(dto.publishedDate),
    cover: dto.cover,
    description: dto.description,
    pageCount: dto.pageCount,
  }
}
