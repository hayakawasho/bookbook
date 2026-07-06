import { CheckoutHistoryScreen } from '../page/CheckoutHistory'
import { HomeScreen } from '../page/Home'
import { LibraryScreen } from '../page/Library'
import { LoginScreen } from '../page/Login'

import { AppProviders } from './AppProviders'
import { type AppTab, useAppState } from './AppStateContext'
import { useAuth } from './AuthContext'
import { BottomTabs } from './BottomTabs'
import './App.css'

function ActiveTabPanel({ tab }: { tab: AppTab }) {
  switch (tab) {
    case 'home':
      return <HomeScreen />
    case 'library':
      return <LibraryScreen />
    case 'checkoutHistory':
      return <CheckoutHistoryScreen />
  }
}

function AppContent() {
  const { authLoading, currentUser, login } = useAuth()
  const { state } = useAppState()

  if (authLoading) {
    return (
      <div className="grid h-dvh place-items-center bg-background text-text">読み込み中...</div>
    )
  }

  if (currentUser === null) {
    return <LoginScreen onLogin={login} />
  }

  return (
    <div className="w-full ___max-w-[430px] mx-auto h-dvh flex flex-col bg-background relative text-text">
      <div className="flex-1 overflow-y-auto overflow-x-hidden pb-[70px]">
        <ActiveTabPanel tab={state.activeTab} />
      </div>
      <BottomTabs />
    </div>
  )
}

export function App() {
  return (
    <AppProviders>
      <AppContent />
    </AppProviders>
  )
}
