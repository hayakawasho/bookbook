import { useBookUsecase } from '../../../../_usecases/book'

import type { Location } from '../../../../_foundation/const'
import type { Book } from '../../../../_models/book'
import type { DialogConfig } from '../types'

type CreateBorrowAfterRegisterDialogOptions = {
  book: Book
  location: Location
  usecase: ReturnType<typeof useBookUsecase>
  showToast: (message: string, type: 'success' | 'error') => void
  clearScanSession: () => void
  handleSheetClose: () => void
  setDialogConfig: (config: DialogConfig | null) => void
  playCheckoutSound: () => void
  unlockCheckoutSound: () => void
}

export function createBorrowAfterRegisterDialog(
  options: CreateBorrowAfterRegisterDialogOptions,
): DialogConfig {
  const {
    book,
    location,
    usecase,
    showToast,
    clearScanSession,
    handleSheetClose,
    setDialogConfig,
    playCheckoutSound,
    unlockCheckoutSound,
  } = options

  return {
    message: 'このまま本を借りますか？',
    confirmLabel: 'はい',
    cancelLabel: 'いいえ',
    width: 287,
    onConfirm: async () => {
      setDialogConfig(null)
      unlockCheckoutSound()
      const result = await usecase.checkoutBook(book, location)

      if (result.err) {
        showToast('貸出に失敗しました', 'error')
        return
      }

      clearScanSession()
      playCheckoutSound()
      showToast('貸出が完了しました', 'success')
    },
    onCancel: () => {
      setDialogConfig(null)
      handleSheetClose()
    },
  }
}
