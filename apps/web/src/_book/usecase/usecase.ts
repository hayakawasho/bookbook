import { useMemo } from 'react'
import type { Location } from '../../_foundation/const'
import type { NotificationGateway } from '../../_foundation/notificationGateway'
import { useCaseResultError, useCaseResultOk, type UseCaseResult } from '../../_foundation/result'
import type { BookRepository, ExternalBookInfo } from '../../_repositories/books/interface'
import type { HistoryRepository } from '../../_repositories/history/interface'
import { useAppContext } from '../../_states/AppContext'
import type { BookCacheMutator } from './cache'
import { useBookCacheMutator } from './cache'

class BookUsecase {
  constructor(
    private bookRepo: BookRepository,
    private historyRepo: HistoryRepository,
    private notify: NotificationGateway,
    private mutator: BookCacheMutator,
  ) {}

  async addNewBook(book: ExternalBookInfo, location: Location): Promise<UseCaseResult<true, Error>> {
    try {
      await this.bookRepo.create(book, location)
      const created = await this.bookRepo.findByIsbn(book.isbn, location)

      if (created.status === 'registered') {
        await this.notify.notify('new-book', location, created.book)
      }

      await Promise.all([
        this.mutator.mutateItem(book.isbn, created.status === 'registered' ? created : undefined, created.status !== 'registered'),
        this.mutator.mutateAllList(),
      ])
      return useCaseResultOk(true)
    } catch (e) {
      return useCaseResultError(e instanceof Error ? e : new Error(String(e)))
    }
  }

  async incrementBook(isbn: string, location: Location): Promise<UseCaseResult<true, Error>> {
    try {
      await this.bookRepo.updateCount(isbn, 'add-copy', location)
      const after = await this.bookRepo.findByIsbn(isbn, location)

      if (after.status === 'registered') {
        await Promise.all([
          this.mutator.mutateItem(isbn, after, false),
          this.mutator.mutateListItem(isbn, after.book),
          this.mutator.mutateBorrowingItems(),
        ])
      }
      return useCaseResultOk(true)
    } catch (e) {
      return useCaseResultError(e instanceof Error ? e : new Error(String(e)))
    }
  }

  async checkoutBook(isbn: string, location: Location): Promise<UseCaseResult<true, Error>> {
    try {
      await this.bookRepo.updateCount(isbn, 'checkout', location)
      await this.historyRepo.createCheckout(isbn, location)
      // createCheckout 成功後は貸出履歴キャッシュを必ず再検証（findByIsbn が未登録でも stale にしない）
      await this.mutator.mutateManyHistory()

      const after = await this.bookRepo.findByIsbn(isbn, location)

      if (after.status === 'registered') {
        await this.notify.notify('checkout', location, after.book)
        await Promise.all([
          this.mutator.mutateItem(isbn, after, false),
          this.mutator.mutateListItem(isbn, after.book),
        ])
      }
      return useCaseResultOk(true)
    } catch (e) {
      return useCaseResultError(e instanceof Error ? e : new Error(String(e)))
    }
  }

  async returnBook(historyId: string, isbn: string, location: Location): Promise<UseCaseResult<true, Error>> {
    try {
      await this.historyRepo.markReturned(historyId, isbn, location)
      await this.bookRepo.updateCount(isbn, 'return', location)
      await this.mutator.mutateManyHistory()

      const after = await this.bookRepo.findByIsbn(isbn, location)

      if (after.status === 'registered') {
        await this.notify.notify('return', location, after.book)
        await Promise.all([
          this.mutator.mutateItem(isbn, after, false),
          this.mutator.mutateListItem(isbn, after.book),
        ])
      }

      return useCaseResultOk(true)
    } catch (e) {
      return useCaseResultError(e instanceof Error ? e : new Error(String(e)))
    }
  }
}

export function useBookUsecase(): BookUsecase {
  const { bookRepo, historyRepo, notificationGateway } = useAppContext()
  const mutator = useBookCacheMutator()

  return useMemo(
    () => new BookUsecase(bookRepo, historyRepo, notificationGateway, mutator),
    [bookRepo, historyRepo, notificationGateway, mutator],
  )
}
