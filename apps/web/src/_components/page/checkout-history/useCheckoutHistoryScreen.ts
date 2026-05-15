import { useCallback, useState } from 'react'
import type { HistoryMetadata } from '../../../_book/model'
import { useAppContext } from '../../../_states/AppContext'
import type {
  DialogConfig,
  HistorySubTab,
  ToastState,
} from './types'

export function useCheckoutHistoryScreen() {
  const { state, dispatch } = useAppContext()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [historySubTab, setHistorySubTab] = useState<HistorySubTab>('borrowing')
  const [dialogConfig, setDialogConfig] = useState<DialogConfig | null>(null)
  const [toast, setToast] = useState<ToastState>(null)

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type })
  }, [])

  const borrowing = state.history.filter(h => !h.isDone)
  const returned = state.history.filter(h => h.isDone)

  const handleReturn = (history: HistoryMetadata) => {
    setDialogConfig({
      title: '返却確認',
      message: `「${history.title}」を返却しますか？`,
      confirmLabel: '返却する',
      onConfirm: () => {
        dispatch({
          type: 'RETURN',
          payload: { historyId: history.historyId, isbn: history.isbn },
        })
        setDialogConfig(null)
        showToast('返却しました', 'success')
      },
    })
  }

  return {
    borrowing,
    dialogConfig,
    handleReturn,
    historySubTab,
    returned,
    setDialogConfig,
    setHistorySubTab,
    setSettingsOpen,
    setToast,
    settingsOpen,
    toast,
  }
}
