import type { Location } from '../../../_foundation/const'
import { useCaseResultError, useCaseResultOk, type UseCaseResult } from '../../../_foundation/result'
import { syncRegistered, type BookDeps } from './shared'

export async function returnBook(
  deps: BookDeps,
  historyId: string,
  isbn: string,
  location: Location,
): Promise<UseCaseResult<true, Error>> {
  try {
    await deps.historyRepo.markReturned(historyId, isbn, location)
    await deps.bookRepo.updateCount(isbn, 'return', location)
    await deps.mutator.mutateManyHistory()

    const after = await deps.bookRepo.findByIsbn(isbn, location)

    if (after.status === 'registered') {
      await deps.notify.notify('return', location, after.book)
      await syncRegistered(deps.mutator, after)
    }

    return useCaseResultOk(true)
  } catch (e) {
    return useCaseResultError(e instanceof Error ? e : new Error(String(e)))
  }
}
