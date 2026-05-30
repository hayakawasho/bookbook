import type { Location } from '../../../_foundation/const'
import { useCaseResultError, useCaseResultOk, type UseCaseResult } from '../../../_foundation/result'
import type { ExternalBookInfo } from '../../../_repositories/books/interface'
import { type BookDeps } from './shared'

export async function addNewBook(
  deps: BookDeps,
  book: ExternalBookInfo,
  location: Location,
): Promise<UseCaseResult<true, Error>> {
  try {
    await deps.bookRepo.create(book, location)
    const created = await deps.bookRepo.findByIsbn(book.isbn, location)

    if (created.status === 'registered') {
      await deps.notify.notify('new-book', location, created.book)

      await Promise.all([
        deps.mutator.mutateItem(String(created.book.id), created, false),
        deps.mutator.mutateAllList(),
      ])

      return useCaseResultOk(true)
    }

    await Promise.all([
      deps.mutator.mutateItem(book.isbn, undefined, true),
      deps.mutator.mutateAllList(),
    ])

    return useCaseResultOk(true)
  } catch (e) {
    return useCaseResultError(e instanceof Error ? e : new Error(String(e)))
  }
}
