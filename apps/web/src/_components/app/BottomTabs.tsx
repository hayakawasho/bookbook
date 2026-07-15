import { NavLink } from 'react-router'

import {
  IconAccount,
  IconAccountFilled,
  IconHome,
  IconHomeFilled,
  IconLibrary,
  IconLibraryFilled,
} from '../ui/icon'

import { useAppState } from './AppStateContext'

type TabId = 'home' | 'library' | 'checkoutHistory'

const TABS: { id: TabId; path: string; label: string }[] = [
  { id: 'home', path: '/', label: 'ホーム' },
  { id: 'library', path: '/library', label: '本棚' },
  { id: 'checkoutHistory', path: '/history', label: '貸出履歴' },
]

function TabPrimaryIcon({
  tabId,
  active,
  cutoutBg,
}: {
  tabId: TabId
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
  const { state } = useAppState()
  const cutoutBg = state.themeMode === 'dark' ? '#000000' : '#FFFFFF'

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] flex bg-surface border-t border-border z-10"
      style={{ height: 'calc(70px + env(safe-area-inset-bottom, 0px))' }}
      aria-label="タブナビゲーション"
    >
      {TABS.map((tab) => (
        <NavLink
          key={tab.id}
          to={tab.path}
          end={tab.path === '/'}
          className="flex-1 flex flex-col items-center justify-center gap-1 cursor-pointer min-w-0"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          {({ isActive }) => (
            <>
              <span
                className={`block [&_svg]:block ${isActive ? 'text-primary' : 'text-middle'}`}
                aria-hidden
              >
                <TabPrimaryIcon tabId={tab.id} active={isActive} cutoutBg={cutoutBg} />
              </span>
              <span
                className={`text-xs leading-[18px] truncate max-w-full px-0.5 ${isActive ? 'font-semibold text-primary' : 'font-light text-middle'}`}
              >
                {tab.label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
