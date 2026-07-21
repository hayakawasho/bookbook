import { type RefObject, useLayoutEffect, useRef, useState } from 'react'

import { createBarcodeScanSession } from '../barcode/barcodeScanSession'
import { createBarcodeScanner } from '../barcode/createBarcodeScanner'
import { HOME_BARCODE_CAMERA_ELEMENT_ID } from '../constants'

type UseBarcodeCaptureOptions = {
  onCapture: (raw: string) => void
  scanBlockedRef: RefObject<boolean>
  clearToast: () => void
  showToast: (message: string, type: 'success' | 'error') => void
}

export function useBarcodeCapture({
  onCapture,
  scanBlockedRef,
  clearToast,
  showToast,
}: UseBarcodeCaptureOptions) {
  const barcodeScannerRef = useRef(createBarcodeScanner())
  const scanSessionRef = useRef(
    createBarcodeScanSession({ rearmGapMs: 700, requiredMatches: 2, failureAfterMs: 3000 }),
  )
  const feedbackTimerRef = useRef<number | null>(null)

  // カメラ不可のときだけ ISBN 手入力にフォールバックする（経路は常に1つ）
  const [cameraOpen, setCameraOpen] = useState(() => barcodeScannerRef.current.isSupported())
  const [isDetecting, setIsDetecting] = useState(false)

  useLayoutEffect(() => {
    if (!cameraOpen) {
      return
    }

    barcodeScannerRef.current.start({
      elementId: HOME_BARCODE_CAMERA_ELEMENT_ID,
      onDetected: (raw) => {
        setIsDetecting(true)
        if (feedbackTimerRef.current !== null) {
          window.clearTimeout(feedbackTimerRef.current)
        }
        feedbackTimerRef.current = window.setTimeout(() => setIsDetecting(false), 250)

        const result = scanSessionRef.current.observe(raw, Date.now(), scanBlockedRef.current)

        if (scanBlockedRef.current) {
          return
        }

        if (result.kind === 'failed') {
          showToast('バーコードを読み取れませんでした。もう一度かざしてください', 'error')
          return
        }

        if (result.kind === 'confirmed') {
          clearToast()
          onCapture(result.isbn)
        }
      },
      onError: () => {
        setCameraOpen(false)
        showToast('カメラを起動できませんでした。ISBNを入力してください', 'error')
      },
    })

    return () => {
      if (feedbackTimerRef.current !== null) {
        window.clearTimeout(feedbackTimerRef.current)
      }
      scanSessionRef.current.reset()
      barcodeScannerRef.current.stop()
    }
  }, [cameraOpen, clearToast, onCapture, showToast, scanBlockedRef])

  return { cameraOpen, isDetecting }
}
