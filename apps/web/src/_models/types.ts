import type { BrandId } from "./defineIdBrand";

/** スキーマ `T` に対し、宣言にないキーを型で弾く入力。 */
export type StrictShape<T extends object, V extends T> = V &
  Record<Exclude<keyof V, keyof T>, never>;

/** `id` 必須のエンティティ。ライブラリ利用者がエンティティ型を定義するときに使う。 */
export type EntityWithId<T extends object, K extends string> = T & {
  id: BrandId<K>;
};
