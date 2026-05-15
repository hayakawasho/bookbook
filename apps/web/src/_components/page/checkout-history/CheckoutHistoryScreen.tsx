import { SettingsScreen } from '../settings/SettingsScreen'
import { Header } from '../../ui/Header'
import { Toast } from '../../ui/Toast'
import { IconCog } from '../../ui/icon'
import { HistoryList } from './HistoryList'
import { HistorySubTabs } from './HistorySubTabs'
import { useCheckoutHistoryScreen } from './useCheckoutHistoryScreen'

export function CheckoutHistoryScreen() {
  const {
    borrowing,
    handleReturn,
    historySubTab,
    returned,
    setHistorySubTab,
    setSettingsOpen,
    setToast,
    settingsOpen,
    toast,
  } = useCheckoutHistoryScreen()

  if (settingsOpen) {
    return <SettingsScreen onBack={() => setSettingsOpen(false)} />
  }

  return (
    <div className={`flex flex-col ${(borrowing.length === 0 || returned.length === 0) ? 'h-full' : ''}`}>
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

      <HistorySubTabs
        activeTab={historySubTab}
        onChangeTab={setHistorySubTab}
      />

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
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  )
}
