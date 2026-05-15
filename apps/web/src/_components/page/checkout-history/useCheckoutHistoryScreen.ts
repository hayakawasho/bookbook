import { useCallback, useState } from 'react'
import type { HistoryMetadata } from '../../../_book/model'
import { useBorrowingItems, useHistoryItems, useBookUsecase } from '../../../_book/usecase'
import { useAppContext } from '../../../_states/AppContext'
import type { DialogConfig, HistorySubTab, ToastState } from './types'

export function useCheckoutHistoryScreen() {
  const { state } = useAppContext()
  const usecase = useBookUsecase()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [historySubTab, setHistorySubTab] = useState<HistorySubTab>('borrowing')
  const [dialogConfig, setDialogConfig] = useState<DialogConfig | null>(null)
  const [toast, setToast] = useState<ToastState>(null)

  const { data: borrowingData = [], isLoading: borrowingLoading } = useBorrowingItems()
  const { data: historyData = [], isLoading: historyLoading } = useHistoryItems()

  const isLoading = borrowingLoading || historyLoading
  const borrowing = borrowingData
  const returned = historyData.filter(h => h.isDone)

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type })
  }, [])

  const handleReturn = (history: HistoryMetadata) => {
    setDialogConfig({
      message: `「${history.title}」を返却しますか？`,
      confirmLabel: '返却する',
      width: 287,
      onConfirm: async () => {
        setDialogConfig(null)
        const result = await usecase.returnBook(history.historyId, history.isbn, state.location)
        if (result.err) {
          showToast('返却に失敗しました', 'error')
          return
        }
        showToast('返却しました', 'success')
      },
    })
  }

  return {
    borrowing,
    dialogConfig,
    handleReturn,
    historySubTab,
    isLoading,
    returned,
    setDialogConfig,
    setHistorySubTab,
    setSettingsOpen,
    setToast,
    settingsOpen,
    toast,
  }
}
