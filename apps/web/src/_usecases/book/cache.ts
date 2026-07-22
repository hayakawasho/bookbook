import { useMemo } from 'react'
import { useSWRConfig } from 'swr'

import { Book, type Book as BookType } from '../../_models/book'
import { useUsecaseDeps } from '../deps'
import { historyCacheKeyGenerator } from '../history/cache'

import type { Location } from '../../_foundation/const'
import type { FindByIsbnResult } from './ports'

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
}

type BookCacheMutator = ReturnType<typeof useBookCacheMutator>

export type { BookCacheMutator }

export function useBookCacheMutator() {
  const { location: loc } = useUsecaseDeps()
  const { mutate } = useSWRConfig()

  return useMemo(
    () => ({
      mutateItem: (isbn: string, newData?: FindByIsbnResult, revalidate?: boolean) => {
        return mutate(bookCacheKeyGenerator.detail(loc, isbn), newData, {
          revalidate: revalidate ?? newData == null,
        })
      },
      // revalidateIfStale: false のため、非マウント中の画面はデータごと消して次回マウント時に必ず fetch させる
      mutateManyHistory: () => {
        return Promise.all([
          mutate(historyCacheKeyGenerator.list(loc, {}), undefined, { revalidate: true }),
          mutate(historyCacheKeyGenerator.list(loc, { isDone: false }), undefined, {
            revalidate: true,
          }),
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
      revalidateBook: (isbn: string) => {
        return Promise.all([
          mutate(bookCacheKeyGenerator.detail(loc, isbn), undefined, { revalidate: true }),
          mutate(
            (key): boolean => {
              return isBookListCacheKey(key, loc)
            },
            undefined,
            { revalidate: true },
          ),
        ])
      },
      mutateAllList: () => {
        return mutate(
          (key): boolean => {
            return isBookListCacheKey(key, loc)
          },
          undefined,
          { revalidate: true },
        )
      },
    }),
    [loc, mutate],
  )
}
