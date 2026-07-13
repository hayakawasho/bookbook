import type { HistorySubTab } from '../types'

type HistorySubTabsProps = {
  activeTab: HistorySubTab
  onChangeTab: (tab: HistorySubTab) => void
}

const HISTORY_SUB_TAB_BASE_CLASS =
  'flex-1 min-h-[56px] bg-transparent border-0 border-b-2 text-sm cursor-pointer py-2'

function historySubTabButtonClass(active: boolean) {
  if (active) {
    return `${HISTORY_SUB_TAB_BASE_CLASS} border-primary font-semibold text-primary`
  }
  return `${HISTORY_SUB_TAB_BASE_CLASS} border-transparent font-light text-text-muted`
}

export function HistorySubTabs({ activeTab, onChangeTab }: HistorySubTabsProps) {
  return (
    <div className="flex bg-surface border-b border-border">
      <button
        type="button"
        className={historySubTabButtonClass(activeTab === 'borrowing')}
        onClick={() => onChangeTab('borrowing')}
      >
        借りている本
      </button>
      <button
        type="button"
        className={historySubTabButtonClass(activeTab === 'past')}
        onClick={() => onChangeTab('past')}
      >
        これまで借りた本
      </button>
    </div>
  )
}
