import type { BookMetadata, HistoryMetadata } from '../../_book/model'
import type { Location } from '../../_foundation/const'
import type { BookRepository } from '../books/interface'
import type { HistoryQuery, HistoryRepository } from './interface'

let idCounter = 1

function historySnapshotFromBook(
  book: BookMetadata,
): Omit<HistoryMetadata, 'historyId' | 'checkoutDate' | 'isDone' | 'returnDate'> {
  return {
    isbn: book.isbn,
    title: book.title,
    author: book.author,
    publisher: book.publisher,
    publishedDate: book.publishedDate,
    cover: book.cover,
    description: book.description,
    availableCount: book.availableCount,
    total: book.total,
  }
}

export class MockHistoryRepository implements HistoryRepository {
  constructor(private readonly books: BookRepository) {}

  private histories: HistoryMetadata[] = []

  findMany(query: HistoryQuery, _location: Location): Promise<HistoryMetadata[]> {
    let list = [...this.histories]
    if (query.isDone === true) {
      list = list.filter(h => h.isDone)
    } else if (query.isDone === false) {
      list = list.filter(h => !h.isDone)
    }
    return Promise.resolve(list)
  }

  async createCheckout(isbn: string, location: Location): Promise<HistoryMetadata> {
    const found = await this.books.findByIsbn(isbn, location)
    if (found.status !== 'registered') {
      throw new Error(`MockHistoryRepository: book not registered for isbn=${isbn}`)
    }
    const snapshot = historySnapshotFromBook(found.book)
    const record: HistoryMetadata = {
      ...snapshot,
      historyId: String(idCounter++),
      checkoutDate: new Date(),
      isDone: false,
    }
    this.histories.push(record)
    return record
  }

  markReturned(historyId: string, isbn: string, _location: Location): Promise<void> {
    const record = this.histories.find(h => h.historyId === historyId)
    if (!record || record.isbn !== isbn) return Promise.resolve()
    record.isDone = true
    record.returnDate = new Date()
    return Promise.resolve()
  }
}
