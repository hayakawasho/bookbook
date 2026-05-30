import { parseDateOrUndefined } from '@bookbook/utils'
import { toBookId } from '../../_models/book'
import type { BookDto, ExternalBookDto } from '../../_models/book'
import type { ExternalBookInfo } from './interface'

export function toBookInput(dto: BookDto) {
  return {
    id: toBookId(dto.isbn),
    title: dto.title,
    author: dto.author,
    publisher: dto.publisher,
    publishedDate: parseDateOrUndefined(dto.publishedDate),
    cover: dto.cover,
    description: dto.description,
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
  }
}
