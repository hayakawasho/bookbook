import { useState, useCallback } from 'react'
import { useAppContext } from '../../../_states/app-context'
import { Header } from '../../ui/header'
import { BookItem } from '../../model/book/book-item'
import { Dialog } from '../../ui/dialog'
import { Toast } from '../../ui/toast'
import type { HistoryMetadata } from '../../../_book/model'
import { SettingsScreen } from '../settings/settings-screen'
import { IconCog } from '../../ui/icon'

type HistorySubTab = 'borrowing' | 'past'

type DialogConfig = {
  title: string
  message: string
  confirmLabel: string
  onConfirm: () => void
}

type ToastState = {
  message: string
  type: 'success' | 'error'
} | null

function formatLoanDate(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}.${m}.${d}`
}

const HISTORY_SUB_TAB_BASE_CLASS =
  'flex-1 min-h-[56px] bg-transparent border-0 border-b-2 text-sm leading-[18px] cursor-pointer py-2'

function historySubTabButtonClass(active: boolean) {
  if (active) {
    return `${HISTORY_SUB_TAB_BASE_CLASS} border-primary font-semibold text-primary`
  }
  return `${HISTORY_SUB_TAB_BASE_CLASS} border-transparent font-light text-text-muted`
}

export function CheckoutHistoryScreen() {
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

  if (settingsOpen) {
    return <SettingsScreen onBack={() => setSettingsOpen(false)} />
  }

  return (
    <div className={`flex flex-col ${(borrowing.length === 0 || returned.length === 0) ? 'h-[stretch]' : ''}`}>
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

      <div className="flex bg-surface border-b border-border">
        <button
          type="button"
          className={historySubTabButtonClass(historySubTab === 'borrowing')}
          onClick={() => setHistorySubTab('borrowing')}
        >
          借りている本
        </button>
        <button
          type="button"
          className={historySubTabButtonClass(historySubTab === 'past')}
          onClick={() => setHistorySubTab('past')}
        >
          これまで借りた本
        </button>
      </div>

      {historySubTab === 'borrowing' && (
        <>
					{borrowing.length === 0 ? (
						<div className="h-[stretch] grid items-center text-sm text-center">
							<p className="">現在本を借りていません
								<span className='block text-text-muted mt-2'>いますぐ本棚を覗いてみよう！</span>
							</p>
						</div>
          ) : (
            <ul className="list-none m-0 p-0">
              {borrowing.map(h => (
                <li key={h.historyId} className="border-b border-border first:border-t first:border-border">
                  <BookItem
                    book={h}
                    prependMeta={
                      <p className="m-0 mb-1 text-xs leading-[17px]">
                        貸出日：{formatLoanDate(h.checkoutDate)}
                      </p>
                    }
                    action={
                      <button
                        type="button"
                        className="w-full min-h-[36px] px-4 bg-primary text-primary-contrast border-0 text-xs font-semibold cursor-pointer"
                        onClick={() => handleReturn(h)}
                      >
                        返却
                      </button>
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {historySubTab === 'past' && (
        <>
					{returned.length === 0 ? (
						<div className="h-[stretch] grid items-center gap-2 text-sm text-center">
            	<p className="text-sm text-text-muted">社内の本を借りてみよう！</p>
						</div>
          ) : (
            <ul className="list-none m-0 p-0">
              {returned.map(h => (
                <li key={h.historyId} className="border-b border-border first:border-t first:border-border">
                  <BookItem
                    book={h}
                    prependMeta={
                      <p className="m-0 mb-1 text-xs leading-[17px]">
                        貸出日：{formatLoanDate(h.checkoutDate)}
                      </p>
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {dialogConfig && (
        <Dialog
          title={dialogConfig.title}
          message={dialogConfig.message}
          confirmLabel={dialogConfig.confirmLabel}
          cancelLabel="キャンセル"
          onConfirm={dialogConfig.onConfirm}
          onCancel={() => setDialogConfig(null)}
        />
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  )
}
