import { useCallback, useState } from 'react'

import { useBookUsecase } from '../../../../_usecases/book'
import { useAppState } from '../../../app'
import { createBorrowAfterRegisterDialog } from '../lib/createBorrowAfterRegisterDialog'

import type { Book } from '../../../../_models/book'
import type { ExternalBookInfo } from '../../../../_usecases/book/ports'
import type { DialogConfig } from '../types'

type UseHomeBookActionsOptions = {
  showToast: (message: string, type: 'success' | 'error') => void
  clearScanSession: () => void
  handleSheetClose: () => void
}

export function useHomeBookActions({
  showToast,
  clearScanSession,
  handleSheetClose,
}: UseHomeBookActionsOptions) {
  const { state } = useAppState()
  const usecase = useBookUsecase()
  const [dialogConfig, setDialogConfig] = useState<DialogConfig | null>(null)

  const handleCheckout = useCallback(
    async (book: Book) => {
      const result = await usecase.checkoutBook(book, state.location)

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
        const result = await usecase.restockBook(book, state.location)

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
          book: result.val,
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
    dialogConfig,
    setDialogConfig,
    handleAddBook,
    handleCheckout,
    handleRestockBook,
  }
}
