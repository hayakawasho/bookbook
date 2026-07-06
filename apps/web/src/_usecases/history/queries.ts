import useSWR from 'swr'

import { useUsecaseDeps } from '../deps'

import { historyCacheKeyGenerator } from './cache'

export function useHistoryItems() {
  const { historyRepo, location } = useUsecaseDeps()

  return useSWR(historyCacheKeyGenerator.list(location, {}), () =>
    historyRepo.findMany({}, location),
  )
}

export function useBorrowingItems() {
  const { historyRepo, location } = useUsecaseDeps()

  return useSWR(historyCacheKeyGenerator.list(location, { isDone: false }), () =>
    historyRepo.findMany({ isDone: false }, location),
  )
}
