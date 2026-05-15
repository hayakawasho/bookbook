import { useMemo } from 'react'
import { useSWRConfig } from 'swr'
import type { Location } from '../../_foundation/const'
import type { BookMetadata } from '../model'
import type { FindByIsbnResult } from '../../_repositories/books/interface'
import type { HistoryQuery } from '../../_repositories/history/interface'
import { useAppContext } from '../../_states/AppContext'

export const bookCacheKeyGenerator = {
  detail: (location: Location, isbn: string) =>
    ['book', 'detail', location, isbn] as const,
  list: (location: Location, query: { q?: string }) =>
    ['book', 'list', location, query] as const,
  history: (location: Location, query: HistoryQuery) =>
    ['book', 'history', location, query] as const,
}

type BookCacheMutator = ReturnType<typeof useBookCacheMutator>
export type { BookCacheMutator }

export function useBookCacheMutator() {
  const { state } = useAppContext()
  const { mutate } = useSWRConfig()
  const loc = state.location

  return useMemo(
    () => ({
      mutateItem: (isbn: string, newData?: FindByIsbnResult, revalidate?: boolean) =>
        mutate(bookCacheKeyGenerator.detail(loc, isbn), newData, {
          revalidate: revalidate ?? newData == null,
        }),
      mutateBorrowingItems: () =>
        mutate(bookCacheKeyGenerator.history(loc, { isDone: false })),
      mutateManyHistory: () =>
        Promise.all([
          mutate(bookCacheKeyGenerator.history(loc, {})),
          mutate(bookCacheKeyGenerator.history(loc, { isDone: false })),
        ]),
      mutateListItem: (isbn: string, patch: Partial<BookMetadata>) =>
        mutate(
          (key): boolean =>
            Array.isArray(key) && key[0] === 'book' && key[1] === 'list' && key[2] === loc,
          (current: BookMetadata[] | undefined) =>
            current?.map(b => (b.isbn === isbn ? { ...b, ...patch } : b)),
          { revalidate: false },
        ),
      mutateAllList: () =>
        mutate(
          (key): boolean =>
            Array.isArray(key) && key[0] === 'book' && key[1] === 'list' && key[2] === loc,
        ),
    }),
    [loc, mutate],
  )
}
