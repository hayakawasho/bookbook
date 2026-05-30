import { type ChangeEvent, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

import { normalizeIsbnBarcode } from '../../../_foundation/utils'
import { useAppContext } from '../../../_states/AppContext'
import { useBookItem, useBookUsecase } from '../../usecase/book'

import type { Location } from '../../../_foundation/const'
import type { Book } from '../../../_models/book'
import type { ExternalBookInfo, FindByIsbnResult } from '../../../_repositories/books/interface'
import type { DialogConfig, SheetMode, ToastState } from './types'

export const HOME_BARCODE_CAMERA_ELEMENT_ID = 'home-html5qrcode-camera'

function sheetModeAfterLookup(bookResult: FindByIsbnResult): SheetMode | 'not-found' {
  if (bookResult.status === 'registered') {
    return { kind: 'existing', book: bookResult.book }
  }

  if (bookResult.status === 'external') {
    return { kind: 'external', book: bookResult.book }
  }

  return 'not-found'
}

function createBorrowAfterRegisterDialog(options: {
  isbn: string
  location: Location
  usecase: ReturnType<typeof useBookUsecase>
  showToast: (message: string, type: 'success' | 'error') => void
  clearScanSession: () => void
  handleSheetClose: () => void
  setDialogConfig: (config: DialogConfig | null) => void
}): DialogConfig {
  const {
    isbn,
    location,
    usecase,
    showToast,
    clearScanSession,
    handleSheetClose,
    setDialogConfig,
  } = options

  return {
    message: 'このまま本を借りますか？',
    confirmLabel: 'はい',
    cancelLabel: 'いいえ',
    width: 287,
    onConfirm: async () => {
      setDialogConfig(null)
      const result = await usecase.checkoutBook(isbn, location)

      if (result.err) {
        showToast('貸出に失敗しました', 'error')
        return
      }

      clearScanSession()
      showToast('貸出が完了しました', 'success')
    },
    onCancel: () => {
      setDialogConfig(null)
      handleSheetClose()
    },
  }
}

export function useHomeScreen() {
  const { state, barcodeScanner } = useAppContext()
  const usecase = useBookUsecase()

  const [isbnInput, setIsbnInput] = useState('')
  const [lookupIsbn, setLookupIsbn] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [cameraOpen, setCameraOpen] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [sheetMode, setSheetMode] = useState<SheetMode | null>(null)
  const sheetModeRef = useRef<SheetMode | null>(null)
  const [dialogConfig, setDialogConfig] = useState<DialogConfig | null>(null)
  const [toast, setToast] = useState<ToastState>(null)

  const { data: bookResult } = useBookItem(lookupIsbn)

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type })
  }, [])

  useEffect(() => {
    // sheetMode を scanner effect の依存に入れるとスキャン開始を毎回やり直すため、閉じた onDetected が最新状態を読めるよう ref で同期する
    sheetModeRef.current = sheetMode
  }, [sheetMode])

  const lookupByBarcodeRaw = useCallback((raw: string) => {
    const isbn = normalizeIsbnBarcode(raw.trim())
    setNotFound(false)
    setSheetMode(null)

    if (!isbn) {
      setNotFound(true)
      return
    }

    setIsbnInput(isbn)
    setLookupIsbn(isbn)
  }, [])

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

  const handleChangeIsbnInput = (value: string) => {
    setIsbnInput(value)
    setNotFound(false)
  }

  const handleManualSearch = () => {
    lookupByBarcodeRaw(isbnInput.trim())
  }

  const handlePickImage = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''

    if (!file) {
      return
    }

    try {
      const raw = await barcodeScanner.scanFile(file)

      if (raw == null) {
        showToast('画像からバーコードを読み取れませんでした', 'error')
        return
      }

      lookupByBarcodeRaw(raw)
    } catch {
      showToast('画像の処理に失敗しました', 'error')
    }
  }

  useLayoutEffect(() => {
    if (!cameraOpen) {
      return
    }

    barcodeScanner.start({
      elementId: HOME_BARCODE_CAMERA_ELEMENT_ID,
      onDetected: (raw) => {
        const sheetBlocksScanWhileOpen = sheetModeRef.current !== null

        if (sheetBlocksScanWhileOpen) {
          return
        }

        lookupByBarcodeRaw(raw)
      },
      onError: (err) => {
        setCameraOpen(false)
        showToast(err.message, 'error')
      },
    })

    return () => {
      barcodeScanner.stop()
    }
  }, [cameraOpen, barcodeScanner, lookupByBarcodeRaw, showToast])

  const handleSheetClose = useCallback(() => {
    setSheetMode(null)
    setLookupIsbn(null)
  }, [])

  const handleToggleCamera = () => {
    if (cameraOpen) {
      setCameraOpen(false)
      return
    }

    if (!barcodeScanner.isSupported()) {
      showToast('この端末ではカメラ読取が使えません', 'error')
      return
    }

    setCameraOpen(true)
  }

  const clearScanSession = useCallback(() => {
    setLookupIsbn(null)
    setSheetMode(null)
    setIsbnInput('')
  }, [])

  const handleCheckout = useCallback(
    async (book: Book) => {
      const result = await usecase.checkoutBook(String(book.id), state.location)

      if (result.err) {
        showToast('貸出に失敗しました', 'error')
        return
      }

      clearScanSession()
      showToast('貸出が完了しました', 'success')
    },
    [clearScanSession, showToast, state.location, usecase],
  )

  const handleRestockBook = (book: Book) => {
    setDialogConfig({
      message: `すでに${book.total}冊登録されています。\nこのまま追加しますか？`,
      confirmLabel: '追加する',
      cancelLabel: 'キャンセル',
      width: 287,
      onConfirm: async () => {
        setDialogConfig(null)
        const result = await usecase.restockBook(String(book.id), state.location)

        if (result.err) {
          showToast('冊数の追加に失敗しました', 'error')
          return
        }

        clearScanSession()
        showToast('本棚に追加しました', 'success')
      },
      onCancel: () => {
        setDialogConfig(null)
        handleSheetClose()
      },
    })
  }

  const handleAddBook = useCallback(
    async (book: ExternalBookInfo) => {
      const result = await usecase.addNewBook(book, state.location)

      if (result.err) {
        showToast('登録に失敗しました', 'error')
        return
      }

      showToast('本棚に追加しました', 'success')
      setDialogConfig(
        createBorrowAfterRegisterDialog({
          isbn: book.isbn,
          location: state.location,
          usecase,
          showToast,
          clearScanSession,
          handleSheetClose,
          setDialogConfig,
        }),
      )
    },
    [clearScanSession, handleSheetClose, showToast, state.location, usecase],
  )

  return {
    cameraOpen,
    dialogConfig,
    fileInputRef,
    handleAddBook,
    handleRestockBook,
    handleChangeIsbnInput,
    handleCheckout,
    handleManualSearch,
    handlePickImage,
    handleSheetClose,
    handleToggleCamera,
    isbnInput,
    notFound,
    setDialogConfig,
    setSheetMode,
    setToast,
    sheetMode,
    toast,
  }
}
