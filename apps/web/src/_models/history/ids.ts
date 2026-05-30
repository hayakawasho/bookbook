import { defineIdBrand, type BrandId } from '../defineIdBrand'

export const toHistoryId = defineIdBrand<'history'>()
export type HistoryId = BrandId<'history'>
