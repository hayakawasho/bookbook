import { BottomTabs } from './_components/layout/BottomTabs'
import { CheckoutHistoryScreen } from './_components/page/checkout-history'
import { HomeScreen } from './_components/page/home'
import { LibraryScreen } from './_components/page/library'
import { LoginScreen } from './_components/page/login'
import { AppProvider, type AppTab, useAppContext } from './_states/AppContext'
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
  const { authLoading, currentUser, login, state } = useAppContext()

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
    <AppProvider>
      <AppContent />
    </AppProvider>
  )
}
