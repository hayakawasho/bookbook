import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
} from 'react'
import type { BookMetadata } from '../../../_book/model'
import { normalizeIsbnBarcode } from '../../../_foundation/utils'
import type { ExternalBookInfo } from '../../../_repositories/books/interface'
import { useAppContext } from '../../../_states/AppContext'
import type { DialogConfig, SheetMode, ToastState } from './types'

export const HOME_BARCODE_CAMERA_ELEMENT_ID = 'home-html5qrcode-camera'

export function useHomeScreen() {
  const { state, dispatch, bookRepo, barcodeScanner } = useAppContext()

  const [isbnInput, setIsbnInput] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [cameraOpen, setCameraOpen] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [sheetMode, setSheetMode] = useState<SheetMode | null>(null)
  const [dialogConfig, setDialogConfig] = useState<DialogConfig | null>(null)
  const [toast, setToast] = useState<ToastState>(null)

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type })
  }, [])

  const lookupByBarcodeRaw = useCallback(
    (raw: string) => {
      const isbn = normalizeIsbnBarcode(raw.trim())
      setNotFound(false)
      setSheetMode(null)

      if (!isbn) {
        setNotFound(true)
        return
      }

      setIsbnInput(isbn)

      const result = bookRepo.findByIsbn(isbn, state.location)
      if (result.status === 'registered') {
        setSheetMode({ kind: 'existing', book: result.book })
        return
      }
      if (result.status === 'external') {
        setSheetMode({ kind: 'external', book: result.book })
        return
      }
      setNotFound(true)
    },
    [bookRepo, state.location],
  )

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
      onDetected: raw => {
        setCameraOpen(false)
        lookupByBarcodeRaw(raw)
      },
      onError: err => {
        setCameraOpen(false)
        showToast(err.message, 'error')
      },
    })

    return () => {
      barcodeScanner.stop()
    }
  }, [cameraOpen, barcodeScanner, lookupByBarcodeRaw, showToast])

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

  const handleCheckout = (book: BookMetadata) => {
    setDialogConfig({
      title: '本を借りる',
      message: `「${book.title}」を借りますか？`,
      confirmLabel: '本を借りる',
      onConfirm: () => {
        dispatch({ type: 'CHECKOUT', payload: { isbn: book.isbn } })
        setDialogConfig(null)
        setSheetMode(null)
        setIsbnInput('')
        showToast('借りました', 'success')
      },
    })
  }

  const handleAddCopy = (book: BookMetadata) => {
    setDialogConfig({
      title: '冊数追加確認',
      message: `「${book.title}」を1冊追加しますか？`,
      confirmLabel: '追加する',
      onConfirm: () => {
        dispatch({ type: 'ADD_COPY', payload: { isbn: book.isbn } })
        setDialogConfig(null)
        setSheetMode(null)
        setIsbnInput('')
        showToast('冊数を追加しました', 'success')
      },
    })
  }

  const handleAddBook = (book: ExternalBookInfo) => {
    setDialogConfig({
      title: '新規登録確認',
      message: `「${book.title}」をライブラリに登録しますか？`,
      confirmLabel: '登録する',
      onConfirm: () => {
        dispatch({
          type: 'ADD_BOOK',
          payload: { ...book, availableCount: 1, total: 1 },
        })
        setDialogConfig(null)
        setSheetMode(null)
        setIsbnInput('')
        showToast('登録しました', 'success')
      },
    })
  }

  return {
    cameraOpen,
    dialogConfig,
    fileInputRef,
    handleAddBook,
    handleAddCopy,
    handleChangeIsbnInput,
    handleCheckout,
    handleManualSearch,
    handlePickImage,
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
