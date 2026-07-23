import useSWR from 'swr'

import { useKeepLatestData } from '../../_foundation/swr/keepLatestData'
import { useUsecaseDeps } from '../deps'

import { bookCacheKeyGenerator } from './cache'

export function useBookItem(isbn: string | null) {
  const { bookRepo, location } = useUsecaseDeps()

  const key = isbn ? bookCacheKeyGenerator.detail(location, isbn) : null
  const swr = useSWR(key, () => bookRepo.findByIsbn(isbn!, location))
  const data = useKeepLatestData(swr.data, key, swr)

  return { ...swr, data }
}

export function useBookItems(q: string) {
  const { bookRepo, location } = useUsecaseDeps()

  const key = bookCacheKeyGenerator.list(location, { q })
  const swr = useSWR(key, () => bookRepo.findMany(q, location))
  const data = useKeepLatestData(swr.data, key, swr)

  return { ...swr, data }
}
