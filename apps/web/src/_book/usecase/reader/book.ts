import useSWR from 'swr'
import { useAppContext } from '../../../_states/AppContext'
import { bookCacheKeyGenerator } from '../cache'

export function useBookItem(isbn: string | null) {
  const { state, bookRepo } = useAppContext()
  const location = state.location

  return useSWR(
    isbn ? bookCacheKeyGenerator.detail(location, isbn) : null,
    () => bookRepo.findByIsbn(isbn!, location),
  )
}

export function useBookItems(q: string) {
  const { state, bookRepo } = useAppContext()
  const location = state.location

  return useSWR(
    bookCacheKeyGenerator.list(location, { q }),
    () => bookRepo.findMany(q, location),
  )
}
