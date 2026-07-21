import { type RefObject, useLayoutEffect, useRef, useState } from 'react'

import { createContinuousDetectionGate } from '../barcode/continuousDetectionGate'
import { createBarcodeScanner } from '../barcode/createBarcodeScanner'
import { HOME_BARCODE_CAMERA_ELEMENT_ID } from '../constants'

type UseBarcodeCaptureOptions = {
  onCapture: (raw: string) => void
  scanBlockedRef: RefObject<boolean>
  showToast: (message: string, type: 'success' | 'error') => void
}

export function useBarcodeCapture({
  onCapture,
  scanBlockedRef,
  showToast,
}: UseBarcodeCaptureOptions) {
  const barcodeScannerRef = useRef(createBarcodeScanner())
  // 映りっぱなしなら検知が途切れない前提。本を持ち上げて再度かざす動作は
  // 数百msの検知断で判別できるため、短めにして「すぐ再スキャン」を成立させる
  const detectionGateRef = useRef(createContinuousDetectionGate(700, 3))

  // カメラ不可のときだけ ISBN 手入力にフォールバックする（経路は常に1つ）
  const [cameraOpen, setCameraOpen] = useState(() => barcodeScannerRef.current.isSupported())

  useLayoutEffect(() => {
    if (!cameraOpen) {
      return
    }

    barcodeScannerRef.current.start({
      elementId: HOME_BARCODE_CAMERA_ELEMENT_ID,
      onDetected: (raw) => {
        // シート表示中も目撃時刻を更新し続ける（閉じた直後に映ったままの同じ本で再発火させない）
        const isNewSighting = detectionGateRef.current.shouldHandle(raw, Date.now())

        if (scanBlockedRef.current || !isNewSighting) {
          return
        }

        onCapture(raw)
      },
      onError: () => {
        setCameraOpen(false)
        showToast('カメラを起動できませんでした。ISBNを入力してください', 'error')
      },
    })

    return () => {
      barcodeScannerRef.current.stop()
    }
  }, [cameraOpen, onCapture, showToast, scanBlockedRef])

  return { cameraOpen }
}
