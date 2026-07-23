import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { useKeepLatestData } from './keepLatestData'

import type { Arguments } from 'swr'

type Props = {
  data: string[] | undefined
  key: Arguments
  isValidating: boolean
  error?: unknown
}

function render(initial: Props) {
  return renderHook(
    ({ data, key, isValidating, error }: Props) =>
      useKeepLatestData(data, key, { isValidating, error }),
    { initialProps: initial },
  )
}

const key = ['book', 'list', 'daikanyama']

describe('useKeepLatestData', () => {
  it('再検証中に data が undefined になっても直前のデータを返す', () => {
    const { result, rerender } = render({ data: ['a'], key, isValidating: false })

    rerender({ data: undefined, key, isValidating: true })

    expect(result.current).toEqual(['a'])
  })

  it('data が更新されたら新しい値を返す', () => {
    const { result, rerender } = render({ data: ['a'], key, isValidating: false })

    rerender({ data: ['b'], key, isValidating: false })

    expect(result.current).toEqual(['b'])
  })

  it('再検証が失敗したら古いデータを返さない', () => {
    const { result, rerender } = render({ data: ['a'], key, isValidating: false })

    rerender({ data: undefined, key, isValidating: true })
    rerender({ data: undefined, key, isValidating: false, error: new Error('fetch failed') })

    expect(result.current).toBeUndefined()
  })

  it('キーが変わったら前のデータは返さない', () => {
    const { result, rerender } = render({ data: ['a'], key, isValidating: false })

    rerender({ data: undefined, key: ['book', 'list', 'kyoto'], isValidating: true })

    expect(result.current).toBeUndefined()
  })
})
