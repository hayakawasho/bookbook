import { defineIdBrand, type BrandId } from '../defineIdBrand'

export const toBookId = defineIdBrand<'book'>()
export type BookId = BrandId<'book'>
