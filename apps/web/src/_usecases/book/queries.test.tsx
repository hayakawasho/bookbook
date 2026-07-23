import { act, renderHook, waitFor } from '@testing-library/react'
import { SWRConfig } from 'swr'
import { describe, expect, it, vi } from 'vitest'

import { UsecaseDepsProvider } from '../deps'

import { useBookCacheMutator } from './cache'
import { useBookItems } from './queries'

import type { ReactNode } from 'react'
import type { Book } from '../../_models/book'
import type { UsecaseDeps } from '../deps'

function setup() {
  const findMany = vi.fn<(q: string, location: string) => Promise<Book[]>>()

  const deps = {
    location: 'daikanyama',
    bookRepo: { findMany },
  } as unknown as UsecaseDeps

  const wrapper = ({ children }: { children: ReactNode }) => (
    <SWRConfig
      value={{
        provider: () => new Map(),
        revalidateIfStale: false,
        dedupingInterval: 0,
        shouldRetryOnError: false,
      }}
    >
      <UsecaseDepsProvider value={deps}>{children}</UsecaseDepsProvider>
    </SWRConfig>
  )

  return { findMany, wrapper }
}

const bookA = { id: 'a' } as unknown as Book
const bookB = { id: 'b' } as unknown as Book

describe('useBookItems と revalidateBook の結合', () => {
  it('再検証中は旧データを維持し、成功後は新データへ切り替わる', async () => {
    const { findMany, wrapper } = setup()
    findMany.mockResolvedValueOnce([bookA])

    const { result } = renderHook(
      () => ({ query: useBookItems(''), mutator: useBookCacheMutator() }),
      { wrapper },
    )
    await waitFor(() => expect(result.current.query.data).toEqual([bookA]))

    let resolveRefetch: (books: Book[]) => void = () => {}
    findMany.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveRefetch = resolve
        }),
    )

    let revalidation: Promise<unknown> = Promise.resolve()
    act(() => {
      revalidation = result.current.mutator.revalidateBook('a')
    })

    // fetch 完了前も旧データが表示され続ける
    expect(result.current.query.data).toEqual([bookA])

    await act(async () => {
      resolveRefetch([bookB])
      await revalidation
    })

    expect(result.current.query.data).toEqual([bookB])
  })

  it('再検証が失敗したら旧データを残さない', async () => {
    const { findMany, wrapper } = setup()
    findMany.mockResolvedValueOnce([bookA])

    const { result } = renderHook(
      () => ({ query: useBookItems(''), mutator: useBookCacheMutator() }),
      { wrapper },
    )
    await waitFor(() => expect(result.current.query.data).toEqual([bookA]))

    findMany.mockRejectedValueOnce(new Error('fetch failed'))

    await act(async () => {
      await result.current.mutator.revalidateBook('a').catch(() => {})
    })

    await waitFor(() => {
      expect(result.current.query.error).toBeInstanceOf(Error)
      expect(result.current.query.data).toBeUndefined()
    })
  })

  it('検索語が変わったら旧データを表示しない', async () => {
    const { findMany, wrapper } = setup()
    findMany.mockResolvedValueOnce([bookA])

    const { result, rerender } = renderHook(({ q }: { q: string }) => useBookItems(q), {
      wrapper,
      initialProps: { q: '' },
    })
    await waitFor(() => expect(result.current.data).toEqual([bookA]))

    findMany.mockImplementationOnce(() => new Promise(() => {}))
    rerender({ q: 'react' })

    expect(result.current.data).toBeUndefined()
  })
})
