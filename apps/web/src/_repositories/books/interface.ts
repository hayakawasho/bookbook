import type { BookMetadata } from '../../_book/model'
import type { Location } from '../../_foundation/const'

export type ExternalBookInfo = Omit<BookMetadata, 'availableCount' | 'total'>

export type FindByIsbnResult =
  | { status: 'registered'; book: BookMetadata }
  | { status: 'external'; book: ExternalBookInfo }
  | { status: 'notfound' }

export type BookCountOperation = 'add-copy' | 'checkout' | 'return'

/** 書籍データの取得・更新（mock / HTTP 実装を差し替え可能） */
export interface BookRepository {
  findByIsbn(isbn: string, location: Location): Promise<FindByIsbnResult>
  findMany(query: string, location: Location): Promise<BookMetadata[]>
  create(book: ExternalBookInfo, location: Location): Promise<void>
  updateCount(isbn: string, operation: BookCountOperation, location: Location): Promise<void>
}
