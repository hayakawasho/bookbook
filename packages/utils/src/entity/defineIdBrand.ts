declare const idBrand: unique symbol

export type BrandId<K extends string> = string & {
  readonly [idBrand]: { readonly [P in K]: K }
}

/** `K` はファイル内で一意な識別子（他と被らない文字列リテラルにする） */
export function defineIdBrand<const K extends string>() {
  return (rawId: string): BrandId<K> => rawId as BrandId<K>
}
