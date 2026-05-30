import {
  type ChangeEvent,
  type RefObject,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'

import { normalizeIsbnBarcode } from '../../../../_foundation/utils'
import { useAppContext } from '../../../../_states/AppContext'
import { HOME_BARCODE_CAMERA_ELEMENT_ID } from '../constants'

import type { SheetMode } from '../types'

type UseHomeBarcodeScanOptions = {
  showToast: (message: string, type: 'success' | 'error') => void
  sheetModeRef: RefObject<SheetMode | null>
  notFound: boolean
  setNotFound: (notFound: boolean) => void
  onLookupIsbn: (isbn: string) => void
  onLookupInvalid: () => void
  onResetSheet: () => void
}

export function useHomeBarcodeScan({
  showToast,
  sheetModeRef,
  notFound,
  setNotFound,
  onLookupIsbn,
  onLookupInvalid,
  onResetSheet,
}: UseHomeBarcodeScanOptions) {
  const { barcodeScanner } = useAppContext()

  const [isbnInput, setIsbnInput] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [cameraOpen, setCameraOpen] = useState(true)

  const lookupByBarcodeRaw = useCallback(
    (raw: string) => {
      const isbn = normalizeIsbnBarcode(raw.trim())
      setNotFound(false)
      onResetSheet()

      if (!isbn) {
        setNotFound(true)
        onLookupInvalid()
        return
      }

      setIsbnInput(isbn)
      onLookupIsbn(isbn)
    },
    [onLookupInvalid, onLookupIsbn, onResetSheet],
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
  }, [cameraOpen, barcodeScanner, lookupByBarcodeRaw, showToast, sheetModeRef])

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

  const resetIsbnInput = useCallback(() => {
    setIsbnInput('')
    setNotFound(false)
  }, [setNotFound])

  return {
    cameraOpen,
    fileInputRef,
    handleChangeIsbnInput,
    handleManualSearch,
    handlePickImage,
    handleToggleCamera,
    isbnInput,
    notFound,
    resetIsbnInput,
  }
}
