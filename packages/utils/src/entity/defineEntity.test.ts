import { describe, expectTypeOf, it } from 'vitest'

import { defineEntity } from './defineEntity'
import { type BrandId, defineIdBrand } from './defineIdBrand'

describe('defineEntity', () => {
  describe('型安全', () => {
    it('BrandId のリテラル型 K が保たれる', () => {
      const idW = defineIdBrand<'work'>()
      const W = defineEntity(idW)<{ title?: string }>()
      const w = W.create({ title: 't' })
      expectTypeOf(w.id).toEqualTypeOf<BrandId<'work'>>()
      expectTypeOf(w.id).not.toEqualTypeOf<BrandId<string>>()
    })

    it('別ブランドの ID は互換性がない', () => {
      const idA = defineIdBrand<'a'>()
      const idB = defineIdBrand<'b'>()
      const A = defineEntity(idA)<{ v: number }>()
      const B = defineEntity(idB)<{ v: number }>()
      const a = A.create({ v: 1 })
      const b = B.create({ v: 2 })
      // @ts-expect-error BrandId<"a"> and BrandId<"b"> are not assignable
      const _: typeof b.id = a.id
    })

    it('定義外のキーは型エラーになる', () => {
      const idT = defineIdBrand<'t'>()
      const E = defineEntity(idT)<{ title: string }>()
      // @ts-expect-error excess key `extra` is not allowed
      E.create({ title: 'x', extra: 1 })
    })
  })
})
