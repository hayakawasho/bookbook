import useSWR from 'swr'
import { useAppContext } from '../../../_states/AppContext'
import { bookCacheKeyGenerator } from '../cache'

export function useHistoryItems() {
  const { state, historyRepo } = useAppContext()
  const location = state.location

  return useSWR(
    bookCacheKeyGenerator.history(location, {}),
    () => historyRepo.findMany({}, location),
  )
}

export function useBorrowingItems() {
  const { state, historyRepo } = useAppContext()
  const location = state.location

  return useSWR(
    bookCacheKeyGenerator.history(location, { isDone: false }),
    () => historyRepo.findMany({ isDone: false }, location),
  )
}
