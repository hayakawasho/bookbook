import { useCallback, useState } from 'react'

import { useBookUsecase } from '../../../../_usecases/book'
import { useAppState } from '../../../app'
import { createBorrowAfterRegisterDialog } from '../logic/createBorrowAfterRegisterDialog'

import { useCheckoutSound } from './useCheckoutSound'

import type { Book } from '../../../../_models/book'
import type { ExternalBookInfo } from '../../../../_usecases/book/ports'
import type { DialogConfig, ToastState } from '../types'

type UseBookActionsOptions = {
  showToast: (
    message: string,
    type: 'success' | 'error',
    action?: NonNullable<ToastState>['action'],
  ) => void
  clearScanSession: () => void
  handleSheetClose: () => void
}

export function useBookActions({
  showToast,
  clearScanSession,
  handleSheetClose,
}: UseBookActionsOptions) {
  const { state } = useAppState()
  const usecase = useBookUsecase()
  const { playCheckoutSound, unlockCheckoutSound } = useCheckoutSound()
  const [dialogConfig, setDialogConfig] = useState<DialogConfig | null>(null)

  const handleCheckout = useCallback(
    async (book: Book) => {
      unlockCheckoutSound()
      const result = await usecase.checkoutBook(book, state.location)

      if (result.err) {
        showToast('貸出に失敗しました', 'error')
        return
      }

      clearScanSession()
      playCheckoutSound()
      showToast('貸出が完了しました', 'success')
    },
    [clearScanSession, playCheckoutSound, showToast, state.location, unlockCheckoutSound, usecase],
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
    async (book: ExternalBookInfo, pendingCover?: Blob) => {
      const result = await usecase.addNewBook(book, state.location)

      if (result.err) {
        showToast('登録に失敗しました', 'error')
        return
      }

      let registeredBook = result.val
      let coverUploadFailed = false

      if (pendingCover) {
        const uploaded = await usecase.uploadBookCover(registeredBook, pendingCover)

        if (uploaded.err) {
          coverUploadFailed = true
        } else {
          registeredBook = uploaded.val
        }
      }

      showToast(
        coverUploadFailed
          ? '本棚に追加しました（表紙画像の保存に失敗しました）'
          : '本棚に追加しました',
        coverUploadFailed ? 'error' : 'success',
        {
          label: '取消',
          onAction: async () => {
            setDialogConfig(null)
            const undone = await usecase.undoNewBook(registeredBook, state.location)

            if (undone.err) {
              showToast('追加の取り消しに失敗しました', 'error')
              return
            }

            showToast('追加を取り消しました', 'success')
          },
        },
      )
      setDialogConfig(
        createBorrowAfterRegisterDialog({
          book: registeredBook,
          location: state.location,
          usecase,
          showToast,
          clearScanSession,
          handleSheetClose,
          setDialogConfig,
          playCheckoutSound,
          unlockCheckoutSound,
        }),
      )
    },
    [
      clearScanSession,
      handleSheetClose,
      playCheckoutSound,
      showToast,
      state.location,
      unlockCheckoutSound,
      usecase,
    ],
  )

  return {
    dialogConfig,
    setDialogConfig,
    handleAddBook,
    handleCheckout,
    handleRestockBook,
  }
}
