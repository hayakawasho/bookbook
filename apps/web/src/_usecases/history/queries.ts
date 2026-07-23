import useSWR from 'swr'

import { useKeepLatestData } from '../../_foundation/swr/keepLatestData'
import { useUsecaseDeps } from '../deps'

import { historyCacheKeyGenerator } from './cache'

export function useHistoryItems() {
  const { historyRepo, location } = useUsecaseDeps()

  const key = historyCacheKeyGenerator.list(location, {})
  const swr = useSWR(key, () => historyRepo.findMany({}, location))
  const data = useKeepLatestData(swr.data, key, swr)

  return { ...swr, data }
}

export function useBorrowingItems() {
  const { historyRepo, location } = useUsecaseDeps()

  const key = historyCacheKeyGenerator.list(location, { isDone: false })
  const swr = useSWR(key, () => historyRepo.findMany({ isDone: false }, location))
  const data = useKeepLatestData(swr.data, key, swr)

  return { ...swr, data }
}
