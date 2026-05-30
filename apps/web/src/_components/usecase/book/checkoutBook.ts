import {
  type UseCaseResult,
  useCaseResultError,
  useCaseResultOk,
} from '../../../_foundation/result'

import { type BookDeps, syncRegistered } from './shared'

import type { Location } from '../../../_foundation/const'

export async function checkoutBook(
  deps: BookDeps,
  isbn: string,
  location: Location,
): Promise<UseCaseResult<true, Error>> {
  try {
    await deps.bookRepo.updateCount(isbn, 'checkout', location)
    await deps.historyRepo.createCheckout(isbn, location)
    // createCheckout 成功後は貸出履歴キャッシュを必ず再検証（findByIsbn が未登録でも stale にしない）
    await deps.mutator.mutateManyHistory()

    const after = await deps.bookRepo.findByIsbn(isbn, location)

    if (after.status === 'registered') {
      await deps.notify.notify('checkout', location, after.book)
      await syncRegistered(deps.mutator, after)
    }

    return useCaseResultOk(true)
  } catch (e) {
    return useCaseResultError(e instanceof Error ? e : new Error(String(e)))
  }
}
