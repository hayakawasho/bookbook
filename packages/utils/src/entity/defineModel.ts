/**
 * 厳密な入力型でモデルを束ねる。`create` は浅いコピーを返す。
 *
 * @example
 * ```ts
 * const base = defineModel<{ hoge: string }>();
 * const Hoge = withExtensions(base, (api) => ({
 *   fuga(plain: { hoge: string }) {
 *     return api.create(plain);
 *   },
 * }));
 * ```
 */

import type { StrictShape } from './types'

type ModelApi<T extends object> = {
  create<V extends T>(input: StrictShape<T, V>): V
}

export function defineModel<T extends object>(): ModelApi<T> {
  return {
    create: <V extends T>(input: StrictShape<T, V>): V => ({ ...input }) as V,
  }
}

/** `defineModel` / `defineEntity` など、`create` を持つファクトリの戻り値の型。 */
export type UnwrapModel<M extends { create: (...args: never[]) => unknown }> = ReturnType<
  M['create']
>
