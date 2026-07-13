import { useCallback, useEffect, useRef, useState } from 'react'

import { normalizeIsbnBarcode } from '../../../../_foundation/utils'
import { useBookItem } from '../../../../_usecases/book'
import { sheetModeAfterLookup } from '../lib/sheetModeAfterLookup'

import type { SheetMode } from '../types'

export function useBookLookup() {
  const [isbnInput, setIsbnInput] = useState('')
  const [lookupIsbn, setLookupIsbn] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [sheetMode, setSheetMode] = useState<SheetMode | null>(null)

  // シート表示中もカメラの検知コールバックは走り続けるため、最新値を ref で参照させる
  const scanBlockedRef = useRef(false)

  useEffect(() => {
    scanBlockedRef.current = sheetMode !== null
  }, [sheetMode])

  const { data: bookResult } = useBookItem(lookupIsbn)

  useEffect(() => {
    if (!lookupIsbn || bookResult === undefined) {
      return
    }

    const next = sheetModeAfterLookup(bookResult)

    if (next === 'not-found') {
      setNotFound(true)
      return
    }

    setSheetMode(next)
  }, [lookupIsbn, bookResult])

  const lookupByBarcodeRaw = useCallback((raw: string) => {
    const isbn = normalizeIsbnBarcode(raw.trim())
    setNotFound(false)
    setSheetMode(null)

    if (!isbn) {
      setNotFound(true)
      setLookupIsbn(null)
      return
    }

    setIsbnInput(isbn)
    setLookupIsbn(isbn)
  }, [])

  const handleChangeIsbnInput = (value: string) => {
    setIsbnInput(value)
    setNotFound(false)
  }

  const handleManualSearch = () => {
    lookupByBarcodeRaw(isbnInput.trim())
  }

  const handleSheetClose = useCallback(() => {
    setSheetMode(null)
    setLookupIsbn(null)
  }, [])

  const clearScanSession = useCallback(() => {
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
