import { expect } from 'vitest'

type EntityWithId = { id: unknown }

/** エンティティの変更操作が元を書き換えず、新インスタンスで状態だけ変えることを検証する */
export function expectImmutableMutation<T extends EntityWithId>(
  before: T,
  after: T,
  opts: {
    assertBefore: (entity: T) => void
    assertAfter: (entity: T) => void
  },
) {
  expect(after).not.toBe(before)
  opts.assertBefore(before)
  opts.assertAfter(after)
  expect(after.id).toBe(before.id)
}
