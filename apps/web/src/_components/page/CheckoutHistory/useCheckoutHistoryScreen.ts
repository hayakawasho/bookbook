import { useCallback, useState } from 'react'

import { Book } from '../../../_models/book'
import { History } from '../../../_models/history'
import { useBookUsecase } from '../../../_usecases/book'
import { useBorrowingItems, useHistoryItems } from '../../../_usecases/history'
import { useAppState } from '../../app'

import type { History as HistoryType } from '../../../_models/history'
import type { HistorySubTab, ToastState } from './types'

export function useCheckoutHistoryScreen() {
  const { state } = useAppState()
  const usecase = useBookUsecase()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [historySubTab, setHistorySubTab] = useState<HistorySubTab>('borrowing')
  const [toast, setToast] = useState<ToastState>(null)

  const { data: borrowingData = [], isLoading: borrowingLoading } = useBorrowingItems()
  const { data: historyData = [], isLoading: historyLoading } = useHistoryItems()

  const isLoading = borrowingLoading || historyLoading
  const borrowing = borrowingData
  const returned = historyData.filter((h) => History.isReturned(h))

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type })
  }, [])

  const handleReturn = useCallback(
    async (history: HistoryType) => {
      const result = await usecase.returnBook(
        String(history.id),
        Book.fromHistory(history),
        state.location,
      )

      if (result.err) {
        showToast('返却に失敗しました', 'error')
        return
      }

      showToast('返却しました', 'success')
    },
    [showToast, state.location, usecase],
  )

  return {
    borrowing,
    handleReturn,
    historySubTab,
    isLoading,
    returned,
    setHistorySubTab,
    setSettingsOpen,
    setToast,
    settingsOpen,
    toast,
  }
}
