import type { BookMetadata, HistoryMetadata } from '../../_book/model'

let idCounter = 1

export class MockHistoryRepository {
  private histories: HistoryMetadata[] = []

  findBorrowing(): HistoryMetadata[] {
    return this.histories.filter(h => !h.isDone)
  }

  findAll(): HistoryMetadata[] {
    return [...this.histories]
  }

  createCheckout(book: BookMetadata): HistoryMetadata {
    const record: HistoryMetadata = {
      ...book,
      historyId: String(idCounter++),
      checkoutDate: new Date(),
      isDone: false,
    }
    this.histories.push(record)
    return record
  }

  markReturned(historyId: string): void {
    const record = this.histories.find(h => h.historyId === historyId)
    if (!record) {
      return
    }
    record.isDone = true
    record.returnDate = new Date()
  }
}
