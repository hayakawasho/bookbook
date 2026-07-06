import type { Location } from '../../_foundation/const'
import type { HistoryQuery } from './ports'

export const historyCacheKeyGenerator = {
  list: (location: Location, query: HistoryQuery) => {
    return ['book', 'history', location, query] as const
  },
}
