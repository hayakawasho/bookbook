import { Navigate, Route, Routes } from 'react-router'

import { CheckoutHistoryScreen } from '../page/CheckoutHistory'
import { HomeScreen } from '../page/Home'
import { LibraryScreen } from '../page/Library'
import { LoginScreen } from '../page/Login'
import { SettingsScreen } from '../page/Settings'

import { AppProviders } from './AppProviders'
import { useAuth } from './AuthContext'
import { BottomTabs } from './BottomTabs'
import './App.css'

function AppContent() {
  const { authLoading, currentUser, login } = useAuth()

  if (authLoading) {
    return (
      <div className="grid h-dvh place-items-center bg-background text-text">読み込み中...</div>
    )
  }

  if (currentUser === null) {
    return <LoginScreen onLogin={login} />
  }

  return (
    <div className="w-full max-w-[430px] mx-auto h-dvh flex flex-col bg-background relative text-text">
      <div className="flex-1 overflow-y-auto overflow-x-hidden pb-[70px]">
        <Routes>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/library" element={<LibraryScreen />} />
          <Route path="/history" element={<CheckoutHistoryScreen />} />
          <Route path="/settings/*" element={<SettingsScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
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
