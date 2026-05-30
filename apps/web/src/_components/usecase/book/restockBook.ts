import type { Location } from '../../../_foundation/const'
import { useCaseResultError, useCaseResultOk, type UseCaseResult } from '../../../_foundation/result'
import { syncRegistered, type BookDeps } from './shared'

export async function restockBook(
  deps: BookDeps,
  isbn: string,
  location: Location,
): Promise<UseCaseResult<true, Error>> {
  try {
    await deps.bookRepo.updateCount(isbn, 'add-copy', location)
    const after = await deps.bookRepo.findByIsbn(isbn, location)

    if (after.status === 'registered') {
      await syncRegistered(deps.mutator, after, { includeBorrowing: true })
    }

    return useCaseResultOk(true)
  } catch (e) {
    return useCaseResultError(e instanceof Error ? e : new Error(String(e)))
  }
}
