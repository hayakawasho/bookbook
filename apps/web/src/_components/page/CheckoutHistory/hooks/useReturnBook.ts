import { useCallback } from 'react'

import { Book } from '../../../../_models/book'
import { useBookUsecase } from '../../../../_usecases/book'
import { useAppState } from '../../../app'

import type { History } from '../../../../_models/history'
import type { ToastState } from '../types'

type UseReturnBookOptions = {
  showToast: (
    message: string,
    type: 'success' | 'error',
    action?: NonNullable<ToastState>['action'],
  ) => void
}

export function useReturnBook({ showToast }: UseReturnBookOptions) {
  const { state } = useAppState()
  const usecase = useBookUsecase()

  return useCallback(
    async (history: History) => {
      const result = await usecase.returnBook(
        String(history.id),
        Book.fromHistory(history),
        state.location,
      )

      if (result.err) {
        showToast('返却に失敗しました', 'error')
        return
      }

      showToast('返却しました', 'success', {
        label: '取消',
        onAction: async () => {
          const undone = await usecase.undoReturnBook(
            String(history.id),
            Book.fromHistory(history),
            state.location,
          )

          if (undone.err) {
            showToast('返却の取り消しに失敗しました', 'error')
            return
          }

          showToast('返却を取り消しました', 'success')
        },
      })
    },
    [showToast, state.location, usecase],
  )
}
