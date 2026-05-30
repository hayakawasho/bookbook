import type { Location } from '../../../_foundation/const'
import {
  type UseCaseResult,
  useCaseResultError,
  useCaseResultOk,
} from '../../../_foundation/result'
import { type BookDeps, syncRegistered } from './shared'

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
