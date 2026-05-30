import { useMemo } from 'react'
import { useSWRConfig } from 'swr'

import type { Location } from '../../../_foundation/const'
import { Book, type Book as BookType } from '../../../_models/book'
import type { FindByIsbnResult } from '../../../_repositories/books/interface'
import type { HistoryQuery } from '../../../_repositories/history/interface'
import { useAppContext } from '../../../_states/AppContext'

function isBookListCacheKey(key: unknown, location: Location): boolean {
  return Array.isArray(key) && key[0] === 'book' && key[1] === 'list' && key[2] === location
}

export const bookCacheKeyGenerator = {
  detail: (location: Location, isbn: string) => {
    return ['book', 'detail', location, isbn] as const
  },
  list: (location: Location, query: { q?: string }) => {
    return ['book', 'list', location, query] as const
  },
  history: (location: Location, query: HistoryQuery) => {
    return ['book', 'history', location, query] as const
  },
}

type BookCacheMutator = ReturnType<typeof useBookCacheMutator>

export type { BookCacheMutator }

export function useBookCacheMutator() {
  const { state } = useAppContext()
  const { mutate } = useSWRConfig()
  const loc = state.location

  return useMemo(
    () => ({
      mutateItem: (isbn: string, newData?: FindByIsbnResult, revalidate?: boolean) => {
        return mutate(bookCacheKeyGenerator.detail(loc, isbn), newData, {
          revalidate: revalidate ?? newData == null,
        })
      },
      mutateBorrowingItems: () => {
        return mutate(bookCacheKeyGenerator.history(loc, { isDone: false }))
      },
      mutateManyHistory: () => {
        return Promise.all([
          mutate(bookCacheKeyGenerator.history(loc, {})),
          mutate(bookCacheKeyGenerator.history(loc, { isDone: false })),
        ])
      },
      mutateListItem: (isbn: string, patch: Partial<BookType>) => {
        return mutate(
          (key): boolean => {
            return isBookListCacheKey(key, loc)
          },
          (current: BookType[] | undefined) => {
            return current?.map((b) => {
              if (String(b.id) === isbn) {
                return Book.create({ ...b, ...patch })
              }

              return b
            })
          },
          { revalidate: false },
        )
      },
      mutateAllList: () => {
        return mutate((key): boolean => {
          return isBookListCacheKey(key, loc)
        })
      },
    }),
    [loc, mutate],
  )
}
