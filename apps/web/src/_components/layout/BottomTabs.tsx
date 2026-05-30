import type { AppTab } from '../../_states/AppContext'
import { useAppContext } from '../../_states/AppContext'
import {
  IconAccount,
  IconAccountFilled,
  IconHome,
  IconHomeFilled,
  IconLibrary,
  IconLibraryFilled,
} from '../ui/icon'

const TABS: { id: AppTab; label: string }[] = [
  { id: 'home', label: 'ホーム' },
  { id: 'library', label: '本棚' },
  { id: 'checkoutHistory', label: '貸出履歴' },
]

function TabPrimaryIcon({
  tabId,
  active,
  cutoutBg,
}: {
  tabId: AppTab
  active: boolean
  cutoutBg: string
}) {
  if (tabId === 'home') {
    return active ? <IconHomeFilled size={24} /> : <IconHome size={24} />
  }
  if (tabId === 'library') {
    return active ? <IconLibraryFilled size={24} bg={cutoutBg} /> : <IconLibrary size={24} />
  }
  return active ? <IconAccountFilled size={24} bg={cutoutBg} /> : <IconAccount size={24} />
}

export function BottomTabs() {
  const { state, dispatch } = useAppContext()
  const cutoutBg = state.themeMode === 'dark' ? '#000000' : '#FFFFFF'

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full ___max-w-[430px] flex bg-surface border-t border-border z-10"
      style={{ height: 'calc(70px + env(safe-area-inset-bottom, 0px))' }}
      aria-label="タブナビゲーション"
    >
      {TABS.map((tab) => {
        const active = state.activeTab === tab.id
        const iconTone = active ? 'text-primary' : 'text-middle'

        return (
          <button
            key={tab.id}
            className="flex-1 flex flex-col items-center justify-center gap-1 bg-transparent border-0 cursor-pointer p-0 min-w-0"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
            onClick={() => dispatch({ type: 'SET_TAB', payload: tab.id })}
            aria-current={active ? 'page' : undefined}
          >
            <span className={`block [&_svg]:block ${iconTone}`} aria-hidden>
              <TabPrimaryIcon tabId={tab.id} active={active} cutoutBg={cutoutBg} />
            </span>
            <span
              className={`text-xs leading-[18px] truncate max-w-full px-0.5 ${active ? 'font-semibold text-primary' : 'font-light text-middle'}`}
            >
              {tab.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
