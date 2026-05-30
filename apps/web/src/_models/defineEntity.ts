/**
 * `defineEntity` は `create` のみを返す。`id` はファクトリには載せず、`create` の戻り値にだけ付く。
 * ペイロード型 `T` には `id` を含めないこと（`EntityPayload` の `id?` と衝突する）。
 *
 * 振る舞いは `extendEntity` ではなく**コンパニオンオブジェクト**（型と同名の const に純関数として束ねる）で表現する。
 * 素データ（メソッド無し）にすることで spread が常に安全になり、クロージャ捕捉による footgun が発生しない。
 *
 * @example
 * ```ts
 * const toHogeId = defineIdBrand<"hoge">();
 * type Hoge = EntityWithId<{ name: string }, "hoge">;
 * const factory = defineEntity(toHogeId)<{ name: string }>();
 *
 * export const Hoge = {
 *   create: factory.create,
 *   rename: (h: Hoge, name: string): Hoge => Hoge.create({ ...h, name }),
 * };
 * ```
 */

import type { BrandId } from "./defineIdBrand";
import type { EntityWithId, StrictShape } from "./types";

/** `create` の入力。`T` に `id` を含めないこと */
type EntityPayload<T extends object, K extends string> = T & {
  id?: BrandId<K>;
};

/** `create` の戻り（入力 `V` + `id`） */
type CreatedEntity<K extends string, V> = V & {
  id: BrandId<K>;
};

type EntityApi<T extends object, K extends string> = {
  create<V extends EntityPayload<T, K>>(
    input: StrictShape<EntityPayload<T, K>, V>,
  ): CreatedEntity<K, V>;
};

/**
 * `K` は `toId` から推論し、`T` は第2段 `defineEntity(toId)<T>()` で明示する。
 */
export function defineEntity<const K extends string>(
  toId: (raw: string) => BrandId<K>,
  generateRawId: () => string = () => crypto.randomUUID(),
): <T extends object>() => EntityApi<T, K> {
  return <T extends object>() => ({
    create: <V extends EntityPayload<T, K>>(
      input: StrictShape<EntityPayload<T, K>, V>,
    ) => {
      const plain = { ...input } as V;
      const id = plain.id !== undefined ? plain.id : toId(generateRawId());

      return {
        ...plain,
        id,
      } as CreatedEntity<K, V>;
    },
  });
}

export type { EntityApi, EntityWithId };
