import { useCallback, useEffect, useState } from 'react'

import { BottomSheet } from '../../ui/BottomSheet'
import { Dialog } from '../../ui/Dialog'
import { Toast } from '../../ui/Toast'

import { HomeBarcodePanel } from './_internal/HomeBarcodePanel'
import { HomeExistingBookSheet, HomeExternalBookSheet } from './_internal/HomeBookSheet'
import { HomeScanHero } from './_internal/HomeScanHero'
import { HOME_BARCODE_CAMERA_ELEMENT_ID } from './constants'
import { useBarcodeCapture } from './hooks/useBarcodeCapture'
import { useBookActions } from './hooks/useBookActions'
import { useBookLookup } from './hooks/useBookLookup'
import { useCoverCapture } from './hooks/useCoverCapture'

import type { ToastState } from './types'

export function HomeScreen() {
  const [toast, setToast] = useState<ToastState>(null)

  const showToast = useCallback(
    (message: string, type: 'success' | 'error', action?: NonNullable<ToastState>['action']) => {
      setToast({ message, type, action })
    },
    [],
  )

  const lookup = useBookLookup({ showToast })
  const coverCapture = useCoverCapture()

  const capture = useBarcodeCapture({
    onCapture: lookup.lookupByBarcodeRaw,
    scanBlockedRef: lookup.scanBlockedRef,
    showToast,
  })

  const handleSheetClose = useCallback(() => {
    coverCapture.clear()
    lookup.handleSheetClose()
  }, [coverCapture, lookup])

  const clearScanSession = useCallback(() => {
    coverCapture.clear()
    lookup.clearScanSession()
  }, [coverCapture, lookup])

  const actions = useBookActions({
    showToast,
    clearScanSession,
    handleSheetClose,
  })

  // シートを閉じずに別の本を検索し直したとき、撮影済み画像を持ち越さない
  const externalIsbn = lookup.sheetMode?.kind === 'external' ? lookup.sheetMode.book.isbn : null
  const clearCoverCapture = coverCapture.clear
  useEffect(() => {
    clearCoverCapture()
  }, [externalIsbn, clearCoverCapture])

  return (
    <div className="min-h-full grid h-[stretch] grid-rows-[minmax(288px,50dvh)_auto] bg-background">
      <div className="min-h-0 flex flex-col h-full bg-[#2B2E31] relative">
        <div className="flex-1 min-h-0 flex flex-col gap-3">
          <HomeBarcodePanel
            cameraElementId={HOME_BARCODE_CAMERA_ELEMENT_ID}
            cameraOpen={capture.cameraOpen}
            isbnInput={lookup.isbnInput}
            notFound={lookup.notFound}
            onChangeIsbnInput={lookup.handleChangeIsbnInput}
            onManualSearch={lookup.handleManualSearch}
          />
        </div>
      </div>

      <HomeScanHero />

      <BottomSheet open={lookup.sheetMode !== null} onClose={handleSheetClose}>
        {lookup.sheetMode?.kind === 'existing' && (
          <HomeExistingBookSheet
            book={lookup.sheetMode.book}
            onAddCopy={actions.handleRestockBook}
            onCheckout={actions.handleCheckout}
          />
        )}
        {lookup.sheetMode?.kind === 'external' && (
          <HomeExternalBookSheet
            book={lookup.sheetMode.book}
            coverPreviewSrc={coverCapture.previewSrc}
            onAddBook={(book) =>
              actions.handleAddBook(book, coverCapture.pendingCover ?? undefined)
            }
            onSelectCoverPhoto={coverCapture.handleSelectPhoto}
          />
        )}
      </BottomSheet>

      {actions.dialogConfig && (
        <Dialog
          message={actions.dialogConfig.message}
          confirmLabel={actions.dialogConfig.confirmLabel}
          cancelLabel={actions.dialogConfig.cancelLabel ?? 'キャンセル'}
          width={actions.dialogConfig.width}
          onConfirm={actions.dialogConfig.onConfirm}
          onCancel={actions.dialogConfig.onCancel ?? (() => actions.setDialogConfig(null))}
        />
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          action={toast.action}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  )
}
