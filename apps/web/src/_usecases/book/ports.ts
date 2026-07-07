import type { Location } from '../../_foundation/const'
import type { Book } from '../../_models/book'

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

export interface BookRepository {
  findByIsbn(isbn: string, location: Location): Promise<FindByIsbnResult>
  findMany(query: string, location: Location): Promise<Book[]>
  createItem(book: ExternalBookInfo, location: Location): Promise<void>
  addCopy(isbn: string, location: Location): Promise<Book>
}
