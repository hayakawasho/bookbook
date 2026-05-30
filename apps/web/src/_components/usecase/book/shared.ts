import type { NotificationGateway } from '../../../_foundation/notificationGateway'
import type { BookRepository, FindByIsbnResult } from '../../../_repositories/books/interface'
import type { HistoryRepository } from '../../../_repositories/history/interface'
import type { BookCacheMutator } from './cache'

export type BookDeps = {
  bookRepo: BookRepository
  historyRepo: HistoryRepository
  notify: NotificationGateway
  mutator: BookCacheMutator
}

type RegisteredResult = Extract<FindByIsbnResult, { status: 'registered' }>

export async function syncRegistered(
  mutator: BookCacheMutator,
  result: RegisteredResult,
  options?: { includeBorrowing?: boolean },
): Promise<void> {
  const bookId = String(result.book.id)
  const tasks = [
    mutator.mutateItem(bookId, result, false),
    mutator.mutateListItem(bookId, result.book),
  ]

  if (options?.includeBorrowing) {
    tasks.push(mutator.mutateBorrowingItems())
  }

  await Promise.all(tasks)
}
