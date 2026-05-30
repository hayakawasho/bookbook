import { useCallback, useState } from 'react'

import { useHomeBarcodeScan } from './hooks/useHomeBarcodeScan'
import { useHomeBookActions } from './hooks/useHomeBookActions'
import { useHomeBookSheet } from './hooks/useHomeBookSheet'
import { useHomeToast } from './hooks/useHomeToast'

export { HOME_BARCODE_CAMERA_ELEMENT_ID } from './constants'

export function useHomeScreen() {
  const { toast, setToast, showToast } = useHomeToast()
  const [lookupIsbn, setLookupIsbn] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)

  const sheet = useHomeBookSheet({
    lookupIsbn,
    setLookupIsbn,
    setNotFound,
  })

  const scan = useHomeBarcodeScan({
    showToast,
    sheetModeRef: sheet.sheetModeRef,
    notFound,
    setNotFound,
    onLookupIsbn: setLookupIsbn,
    onLookupInvalid: () => setLookupIsbn(null),
    onResetSheet: sheet.resetSheet,
  })

  const clearScanSession = useCallback(() => {
    sheet.clearSheetLookup()
    scan.resetIsbnInput()
  }, [scan.resetIsbnInput, sheet.clearSheetLookup])

  const actions = useHomeBookActions({
    showToast,
    clearScanSession,
    handleSheetClose: sheet.handleSheetClose,
  })

  return {
    cameraOpen: scan.cameraOpen,
    dialogConfig: actions.dialogConfig,
    fileInputRef: scan.fileInputRef,
    handleAddBook: actions.handleAddBook,
    handleRestockBook: actions.handleRestockBook,
    handleChangeIsbnInput: scan.handleChangeIsbnInput,
    handleCheckout: actions.handleCheckout,
    handleManualSearch: scan.handleManualSearch,
    handlePickImage: scan.handlePickImage,
    handleSheetClose: sheet.handleSheetClose,
    handleToggleCamera: scan.handleToggleCamera,
    isbnInput: scan.isbnInput,
    notFound: scan.notFound,
    setDialogConfig: actions.setDialogConfig,
    setToast,
    sheetMode: sheet.sheetMode,
    toast,
  }
}
