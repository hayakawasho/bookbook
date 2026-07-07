import { Book } from '../../_models/book'
import { History, toHistoryId } from '../../_models/history'

import type { Location } from '../../_foundation/const'
import type { BookRepository } from '../../_usecases/book/ports'
import type { HistoryQuery, HistoryRepository } from '../../_usecases/history/ports'
import type { MockBookRepository } from '../books/repository'

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
    ...Book.toSnapshot(book),
    checkoutDate: new Date(),
    isDone: false,
    borrowerEmail: 'mock@local.dev',
    borrowerName: 'Mock',
  }
}

export class MockHistoryRepository implements HistoryRepository {
  // 実行時は必ず MockBookRepository とペアで生成される（in-memory 在庫整合のための内部更新に使う）
  constructor(private readonly books: BookRepository & Partial<MockBookRepository>) {}

  private histories: History[] = []

  findMany(query: HistoryQuery, _location: Location): Promise<History[]> {
    const list = this.histories.filter((h) => matchesHistoryQuery(h, query))
    return Promise.resolve(list)
  }

  async createItem(isbn: string, location: Location): Promise<History> {
    const found = await this.books.findByIsbn(isbn, location)

    if (found.status !== 'registered') {
      throw new Error(`MockHistoryRepository: book not registered for isbn=${isbn}`)
    }

    // サーバー側で貸出時に在庫減算されるため、Mock でも同様に反映する
    this.books.internalUpdateItem?.(Book.checkout(found.book))

    const record = History.create(createHistoryFromBook(found.book))
    this.histories.push(record)
    return record
  }

  async returnItem(historyId: string, location: Location): Promise<void> {
    const target = this.histories.find((h) => String(h.id) === historyId)

    if (!target || History.isReturned(target)) {
      return
    }

    // サーバー側で返却時に在庫が戻るため、Mock でも同様に反映する
    const found = await this.books.findByIsbn(target.isbn, location)

    if (found.status === 'registered') {
      this.books.internalUpdateItem?.(Book.return(found.book))
    }

    this.histories = this.histories.map((h) =>
      String(h.id) === historyId ? History.markReturned(h, new Date()) : h,
    )
  }
}
