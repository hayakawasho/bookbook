import { renderHook } from '@testing-library/react'
import { act } from 'react'
import { SWRConfig, unstable_serialize } from 'swr'
import { describe, expect, it } from 'vitest'

import { UsecaseDepsProvider } from '../deps'
import { historyCacheKeyGenerator } from '../history/cache'

import { bookCacheKeyGenerator, useBookCacheMutator } from './cache'

import type { ReactNode } from 'react'
import type { UsecaseDeps } from '../deps'

function setup() {
  const cache = new Map()

  const deps = { location: 'daikanyama' } as UsecaseDeps

  const wrapper = ({ children }: { children: ReactNode }) => (
    <SWRConfig value={{ provider: () => cache }}>
      <UsecaseDepsProvider value={deps}>{children}</UsecaseDepsProvider>
    </SWRConfig>
  )

  const { result } = renderHook(() => useBookCacheMutator(), { wrapper })

  // _k は SWR が filter 関数へ渡す元キー（useSWR マウント時に設定される内部フィールド）
  const seed = (key: unknown, data: unknown) => {
    cache.set(unstable_serialize(key), { data, _k: key })
  }
  const dataOf = (key: unknown) => cache.get(unstable_serialize(key))?.data

  return { mutator: result.current, seed, dataOf }
}

describe('useBookCacheMutator.revalidateBook', () => {
  it('detail と全検索条件の list を消去し、別 location は維持する', async () => {
    const { mutator, seed, dataOf } = setup()

    const detailKey = bookCacheKeyGenerator.detail('daikanyama', '9784000000000')
    const listAllKey = bookCacheKeyGenerator.list('daikanyama', { q: '' })
    const listSearchKey = bookCacheKeyGenerator.list('daikanyama', { q: 'react' })
    const otherLocationKey = bookCacheKeyGenerator.list('kyoto', { q: '' })

    seed(detailKey, { status: 'registered' })
    seed(listAllKey, [{ id: '9784000000000' }])
    seed(listSearchKey, [{ id: '9784000000000' }])
    seed(otherLocationKey, [{ id: '9784111111111' }])

    // 非マウントのため再検証の fetch は走らず、古い確定値が消えることだけを検証する
    await act(() => mutator.revalidateBook('9784000000000'))

    expect(dataOf(detailKey)).toBeUndefined()
    expect(dataOf(listAllKey)).toBeUndefined()
    expect(dataOf(listSearchKey)).toBeUndefined()
    expect(dataOf(otherLocationKey)).toEqual([{ id: '9784111111111' }])
  })
})

describe('useBookCacheMutator.mutateManyHistory', () => {
  it('通常履歴と未返却履歴の両方を消去する', async () => {
    const { mutator, seed, dataOf } = setup()

    const allKey = historyCacheKeyGenerator.list('daikanyama', {})
    const borrowingKey = historyCacheKeyGenerator.list('daikanyama', { isDone: false })

    seed(allKey, [{ historyId: '1' }])
    seed(borrowingKey, [{ historyId: '1' }])

    await act(() => mutator.mutateManyHistory())

    expect(dataOf(allKey)).toBeUndefined()
    expect(dataOf(borrowingKey)).toBeUndefined()
  })
})
