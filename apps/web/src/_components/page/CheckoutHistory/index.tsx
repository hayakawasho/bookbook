import { useCallback, useState } from 'react'

import { History } from '../../../_models/history'
import { useBorrowingItems, useHistoryItems } from '../../../_usecases/history'
import { Header } from '../../ui/Header'
import { IconCog } from '../../ui/icon'
import { Toast } from '../../ui/Toast'
import { SettingsScreen } from '../Settings'

import { HistoryList } from './_internal/HistoryList'
import { HistorySubTabs } from './_internal/HistorySubTabs'
import { useReturnBook } from './hooks/useReturnBook'

import type { HistorySubTab, ToastState } from './types'

export function CheckoutHistoryScreen() {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [historySubTab, setHistorySubTab] = useState<HistorySubTab>('borrowing')
  const [toast, setToast] = useState<ToastState>(null)

  const showToast = useCallback(
    (message: string, type: 'success' | 'error', action?: NonNullable<ToastState>['action']) => {
      setToast({ message, type, action })
    },
    [],
  )

  const { data: borrowing = [] } = useBorrowingItems()
  const { data: historyData = [] } = useHistoryItems()
  const returned = historyData.filter((h) => History.isReturned(h))

  const handleReturn = useReturnBook({ showToast })

  if (settingsOpen) {
    return <SettingsScreen onBack={() => setSettingsOpen(false)} />
  }

  return (
    <div
      className={`flex flex-col ${borrowing.length === 0 || returned.length === 0 ? 'h-full' : ''}`}
    >
      <Header
        title="貸出履歴"
        rightAction={
          <button
            type="button"
            className="flex items-center justify-center w-[44px] h-[44px] bg-transparent border-0 cursor-pointer text-primary p-0"
            onClick={() => setSettingsOpen(true)}
            aria-label="設定"
          >
            <IconCog size={22} />
          </button>
        }
      />

      <HistorySubTabs activeTab={historySubTab} onChangeTab={setHistorySubTab} />

      <HistoryList
        activeTab={historySubTab}
        borrowing={borrowing}
        returned={returned}
        onReturn={handleReturn}
      />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          action={toast.action}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  )
}
