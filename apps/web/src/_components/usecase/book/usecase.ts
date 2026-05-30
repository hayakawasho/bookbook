import { useMemo } from 'react'
import type { Location } from '../../../_foundation/const'
import type { UseCaseResult } from '../../../_foundation/result'
import type { ExternalBookInfo } from '../../../_repositories/books/interface'
import { useAppContext } from '../../../_states/AppContext'
import { addNewBook as runAddNewBook } from './addNewBook'
import { restockBook as runRestockBook } from './restockBook'
import { checkoutBook as runCheckoutBook } from './checkoutBook'
import { useBookCacheMutator } from './cache'
import { returnBook as runReturnBook } from './returnBook'
import type { BookDeps } from './shared'

export function useBookUsecase() {
  const { bookRepo, historyRepo, notificationGateway } = useAppContext()
  const mutator = useBookCacheMutator()

  return useMemo(() => {
    const deps: BookDeps = {
      bookRepo,
      historyRepo,
      notify: notificationGateway,
      mutator,
    }

    return {
      addNewBook: (
        book: ExternalBookInfo,
        location: Location,
      ): Promise<UseCaseResult<true, Error>> => runAddNewBook(deps, book, location),

      restockBook: (
        isbn: string,
        location: Location,
      ): Promise<UseCaseResult<true, Error>> => runRestockBook(deps, isbn, location),

      checkoutBook: (
        isbn: string,
        location: Location,
      ): Promise<UseCaseResult<true, Error>> => runCheckoutBook(deps, isbn, location),

      returnBook: (
        historyId: string,
        isbn: string,
        location: Location,
      ): Promise<UseCaseResult<true, Error>> =>
        runReturnBook(deps, historyId, isbn, location),
    }
  }, [bookRepo, historyRepo, notificationGateway, mutator])
}
