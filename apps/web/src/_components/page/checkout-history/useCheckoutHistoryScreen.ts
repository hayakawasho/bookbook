import { useCallback, useState } from 'react'

import type { History as HistoryType } from '../../../_models/history'
import { History } from '../../../_models/history'
import { useAppContext } from '../../../_states/AppContext'
import { useBookUsecase, useBorrowingItems, useHistoryItems } from '../../usecase/book'
import type { HistorySubTab, ToastState } from './types'

export function useCheckoutHistoryScreen() {
  const { state } = useAppContext()
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
      const result = await usecase.returnBook(String(history.id), history.isbn, state.location)

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
