import { useCallback, useEffect, useRef, useState } from 'react'

import { normalizeIsbnBarcode } from '../../../../_foundation/utils'
import { useBookItem } from '../../../../_usecases/book'
import { sheetModeAfterLookup } from '../logic/sheetModeAfterLookup'

import type { SheetMode } from '../types'

type UseBookLookupOptions = {
  showToast: (message: string, type: 'success' | 'error') => void
}

export function useBookLookup({ showToast }: UseBookLookupOptions) {
  const [isbnInput, setIsbnInput] = useState('')
  const [lookupIsbn, setLookupIsbn] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [sheetMode, setSheetMode] = useState<SheetMode | null>(null)

  // シート表示中もカメラの検知コールバックは走り続けるため、最新値を ref で参照させる
  const scanBlockedRef = useRef(false)

  const { data: bookResult, error: bookError } = useBookItem(lookupIsbn)

  useEffect(() => {
    if (!lookupIsbn || !bookError) {
      return
    }

    scanBlockedRef.current = false
    setLookupIsbn(null)
    showToast('本の情報を確認できませんでした。時間を置いて、もう一度お試しください', 'error')
  }, [bookError, lookupIsbn, showToast])

  useEffect(() => {
    if (!lookupIsbn || bookResult === undefined) {
      return
    }

    const next = sheetModeAfterLookup(bookResult)

    if (next === 'not-found') {
      scanBlockedRef.current = false
      setNotFound(true)
      setLookupIsbn(null)
      showToast('本の情報が見つかりませんでした', 'error')
      return
    }

    setSheetMode(next)
  }, [lookupIsbn, bookResult, showToast])

  const lookupByBarcodeRaw = useCallback(
    (raw: string) => {
      if (scanBlockedRef.current) {
        return
      }

      const isbn = normalizeIsbnBarcode(raw.trim())
      setNotFound(false)
      setSheetMode(null)

      if (!isbn) {
        setNotFound(true)
        setLookupIsbn(null)
        showToast('バーコードを読み取れませんでした。もう一度かざしてください', 'error')
        return
      }

      scanBlockedRef.current = true
      setIsbnInput(isbn)
      setLookupIsbn(isbn)
    },
    [showToast],
  )

  const handleChangeIsbnInput = (value: string) => {
    setIsbnInput(value)
    setNotFound(false)
  }

  const handleManualSearch = () => {
    lookupByBarcodeRaw(isbnInput.trim())
  }

  const handleSheetClose = useCallback(() => {
    scanBlockedRef.current = false
    setSheetMode(null)
    setLookupIsbn(null)
  }, [])

  const clearScanSession = useCallback(() => {
    scanBlockedRef.current = false
    setSheetMode(null)
    setLookupIsbn(null)
    setIsbnInput('')
    setNotFound(false)
  }, [])

  return {
    clearScanSession,
    handleChangeIsbnInput,
    handleManualSearch,
    handleSheetClose,
    isbnInput,
    lookupByBarcodeRaw,
    notFound,
    scanBlockedRef,
    sheetMode,
  }
}
