import { useRef } from 'react'
import { unstable_serialize } from 'swr'

import type { Arguments } from 'swr'

type SwrState = {
  isValidating: boolean
  error: unknown
}

/**
 * キャッシュ破棄+再検証（mutate(key, undefined, { revalidate: true })）の間、
 * data が undefined になって画面がちらつくのを防ぐため直前のデータを返す。
 * 保持は再検証中かつエラーなしの間だけ。失敗確定後やキー変更時に古いデータを返すと
 * 「古いスナップショットを消す」方針を破るため保持しない。
 */
export function useKeepLatestData<T>(
  data: T | undefined,
  key: Arguments,
  { isValidating, error }: SwrState,
): T | undefined {
  const serialized = unstable_serialize(key)
  const ref = useRef<{ key: string; data: T | undefined }>({ key: serialized, data })

  if (ref.current.key !== serialized) {
    ref.current = { key: serialized, data: undefined }
  }

  if (data !== undefined) {
    ref.current.data = data
  }

  if (data !== undefined) {
    return data
  }

  return isValidating && error == null ? ref.current.data : undefined
}
