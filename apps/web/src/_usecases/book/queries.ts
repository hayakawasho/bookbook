import useSWR from 'swr'

import { useUsecaseDeps } from '../deps'

import { bookCacheKeyGenerator } from './cache'

export function useBookItem(isbn: string | null) {
  const { bookRepo, location } = useUsecaseDeps()

  return useSWR(isbn ? bookCacheKeyGenerator.detail(location, isbn) : null, () =>
    bookRepo.findByIsbn(isbn!, location),
  )
}

export function useBookItems(q: string) {
  const { bookRepo, location } = useUsecaseDeps()

  return useSWR(bookCacheKeyGenerator.list(location, { q }), () => bookRepo.findMany(q, location))
}
