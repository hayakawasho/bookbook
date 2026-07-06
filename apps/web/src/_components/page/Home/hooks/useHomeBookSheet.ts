import { useCallback, useEffect, useRef, useState } from 'react'

import { useBookItem } from '../../../../_usecases/book'
import { sheetModeAfterLookup } from '../lib/sheetModeAfterLookup'

import type { SheetMode } from '../types'

type UseHomeBookSheetOptions = {
  lookupIsbn: string | null
  setLookupIsbn: (isbn: string | null) => void
  setNotFound: (notFound: boolean) => void
}

export function useHomeBookSheet({
  lookupIsbn,
  setLookupIsbn,
  setNotFound,
}: UseHomeBookSheetOptions) {
  const [sheetMode, setSheetMode] = useState<SheetMode | null>(null)
  const sheetModeRef = useRef<SheetMode | null>(null)

  const { data: bookResult } = useBookItem(lookupIsbn)

  useEffect(() => {
    sheetModeRef.current = sheetMode
  }, [sheetMode])

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
  }, [lookupIsbn, bookResult, setNotFound])

  const handleSheetClose = useCallback(() => {
    setSheetMode(null)
    setLookupIsbn(null)
  }, [setLookupIsbn])

  const resetSheet = useCallback(() => {
    setSheetMode(null)
  }, [])

  return {
    sheetMode,
    sheetModeRef,
    handleSheetClose,
    resetSheet,
    clearSheetLookup: useCallback(() => {
      setSheetMode(null)
      setLookupIsbn(null)
    }, [setLookupIsbn]),
  }
}
