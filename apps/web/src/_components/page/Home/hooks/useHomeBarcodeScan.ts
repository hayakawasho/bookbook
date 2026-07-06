import {
  type ChangeEvent,
  type RefObject,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'

import { normalizeIsbnBarcode } from '../../../../_foundation/utils'
import { createContinuousDetectionGate } from '../barcode/continuousDetectionGate'
import { createBarcodeScanner } from '../barcode/createBarcodeScanner'
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
  const barcodeScannerRef = useRef(createBarcodeScanner())
  // fps=8（約125ms間隔）で映りっぱなしなら検知が途切れない前提。本を持ち上げて再度かざす動作は
  // 数百msの検知断で判別できるため、短めにして「すぐ再スキャン」を成立させる
  const detectionGateRef = useRef(createContinuousDetectionGate(700))

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
      const raw = await barcodeScannerRef.current.scanFile(file)

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

    barcodeScannerRef.current.start({
      elementId: HOME_BARCODE_CAMERA_ELEMENT_ID,
      onDetected: (raw) => {
        // シート表示中も目撃時刻を更新し続ける（閉じた直後に映ったままの同じ本で再発火させない）
        const isNewSighting = detectionGateRef.current.shouldHandle(raw, Date.now())

        const sheetBlocksScanWhileOpen = sheetModeRef.current !== null

        if (sheetBlocksScanWhileOpen || !isNewSighting) {
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
      barcodeScannerRef.current.stop()
    }
  }, [cameraOpen, lookupByBarcodeRaw, showToast, sheetModeRef])

  const handleToggleCamera = () => {
    if (cameraOpen) {
      setCameraOpen(false)
      return
    }

    if (!barcodeScannerRef.current.isSupported()) {
      showToast('この端末ではカメラ読取が使えません', 'error')
      return
    }

    detectionGateRef.current.reset()
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
