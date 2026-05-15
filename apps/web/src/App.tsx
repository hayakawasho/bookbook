import { AppProvider, useAppContext, type AppTab } from './_states/AppContext'
import { BottomTabs } from './_components/navigation/BottomTabs'
import { HomeScreen } from './_components/page/home/HomeScreen'
import { LibraryScreen } from './_components/page/library/LibraryScreen'
import { CheckoutHistoryScreen } from './_components/page/checkout-history/CheckoutHistoryScreen'
import { LoginScreen } from './_components/page/login/LoginScreen'
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
      <div className="grid h-dvh place-items-center bg-background text-text">
        読み込み中...
      </div>
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
