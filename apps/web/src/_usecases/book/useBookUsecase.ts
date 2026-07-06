import { useMemo } from 'react'

import { useUsecaseDeps } from '../deps'

import { useBookCacheMutator } from './cache'
import {
  type BookDeps,
  addNewBook as runAddNewBook,
  checkoutBook as runCheckoutBook,
  restockBook as runRestockBook,
  returnBook as runReturnBook,
} from './commands'

import type { UseCaseResult } from '@bookbook/utils'
import type { Location } from '../../_foundation/const'
import type { Book } from '../../_models/book'
import type { ExternalBookInfo } from './ports'

export function useBookUsecase() {
  const { bookRepo, historyRepo } = useUsecaseDeps()
  const mutator = useBookCacheMutator()

  return useMemo(() => {
    const deps: BookDeps = {
      bookRepo,
      historyRepo,
      mutator,
    }

    return {
      addNewBook: (
        book: ExternalBookInfo,
        location: Location,
      ): Promise<UseCaseResult<Book, Error>> => runAddNewBook(deps, book, location),

      restockBook: (book: Book, location: Location): Promise<UseCaseResult<true, Error>> =>
        runRestockBook(deps, book, location),

      checkoutBook: (book: Book, location: Location): Promise<UseCaseResult<true, Error>> =>
        runCheckoutBook(deps, book, location),

      returnBook: (
        historyId: string,
        book: Book,
        location: Location,
      ): Promise<UseCaseResult<true, Error>> => runReturnBook(deps, historyId, book, location),
    }
  }, [bookRepo, historyRepo, mutator])
}
