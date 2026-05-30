import { useBookUsecase } from '../../../usecase/book'

import type { Location } from '../../../../_foundation/const'
import type { DialogConfig } from '../types'

type CreateBorrowAfterRegisterDialogOptions = {
  isbn: string
  location: Location
  usecase: ReturnType<typeof useBookUsecase>
  showToast: (message: string, type: 'success' | 'error') => void
  clearScanSession: () => void
  handleSheetClose: () => void
  setDialogConfig: (config: DialogConfig | null) => void
}

export function createBorrowAfterRegisterDialog(
  options: CreateBorrowAfterRegisterDialogOptions,
): DialogConfig {
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
