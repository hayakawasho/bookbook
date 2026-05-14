import { AppProvider, useAppContext, type AppTab } from './_states/app-context'
import { BottomTabs } from './_components/navigation/bottom-tabs'
import { HomeScreen } from './_components/page/home/home-screen'
import { LibraryScreen } from './_components/page/library/library-screen'
import { CheckoutHistoryScreen } from './_components/page/checkout-history/checkout-history-screen'
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
  const { state } = useAppContext()

  return (
    <div className="w-full max-w-[430px] mx-auto h-dvh flex flex-col bg-background relative text-text">
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
