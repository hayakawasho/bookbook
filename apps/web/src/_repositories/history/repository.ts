import type { Location } from '../../_foundation/const'
import type { Book } from '../../_models/book'
import { History, toHistoryId } from '../../_models/history'
import type { BookRepository } from '../books/interface'
import type { HistoryQuery, HistoryRepository } from './interface'

let idCounter = 1

function matchesHistoryQuery(history: History, query: HistoryQuery): boolean {
  if (query.isDone === undefined) {
    return true
  }

  return History.isReturned(history) === query.isDone
}

function createHistoryFromBook(book: Book) {
  return {
    id: toHistoryId(String(idCounter++)),
    isbn: String(book.id),
    title: book.title,
    author: book.author,
    publisher: book.publisher,
    publishedDate: book.publishedDate,
    cover: book.cover,
    description: book.description,
    checkoutDate: new Date(),
    isDone: false,
    borrowerEmail: 'mock@local.dev',
    borrowerName: 'Mock',
  }
}

export class MockHistoryRepository implements HistoryRepository {
  constructor(private readonly books: BookRepository) {}

  private histories: History[] = []

  findMany(query: HistoryQuery, _location: Location): Promise<History[]> {
    const list = this.histories.filter((h) => matchesHistoryQuery(h, query))
    return Promise.resolve(list)
  }

  async createCheckout(isbn: string, location: Location): Promise<History> {
    const found = await this.books.findByIsbn(isbn, location)

    if (found.status !== 'registered') {
      throw new Error(`MockHistoryRepository: book not registered for isbn=${isbn}`)
    }

    const record = History.create(createHistoryFromBook(found.book))
    this.histories.push(record)
    return record
  }

  markReturned(historyId: string, isbn: string, _location: Location): Promise<void> {
    this.histories = this.histories.map((h) => {
      const isTarget = String(h.id) === historyId && h.isbn === isbn

      if (!isTarget) {
        return h
      }

      return History.markReturned(h, new Date())
    })

    return Promise.resolve()
  }
}
