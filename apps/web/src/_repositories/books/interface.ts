import type { Book } from '../../_models/book'
import type { Location } from '../../_foundation/const'

export type ExternalBookInfo = {
  isbn: string
  title: string
  author?: string
  publisher?: string
  publishedDate?: Date
  cover: { src?: string }
  description?: string
}

export type FindByIsbnResult =
  | { status: 'registered'; book: Book }
  | { status: 'external'; book: ExternalBookInfo }
  | { status: 'notfound' }

export type BookCountOperation = 'add-copy' | 'checkout' | 'return'

export interface BookRepository {
  findByIsbn(isbn: string, location: Location): Promise<FindByIsbnResult>
  findMany(query: string, location: Location): Promise<Book[]>
  create(book: ExternalBookInfo, location: Location): Promise<void>
  updateCount(isbn: string, operation: BookCountOperation, location: Location): Promise<void>
}
