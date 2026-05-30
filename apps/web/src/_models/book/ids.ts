import { type BrandId, defineIdBrand } from '@bookbook/utils'

export const toBookId = defineIdBrand<'book'>()
export type BookId = BrandId<'book'>
