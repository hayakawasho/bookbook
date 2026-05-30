import { type BrandId, defineIdBrand } from '@bookbook/utils'

export const toHistoryId = defineIdBrand<'history'>()
export type HistoryId = BrandId<'history'>
