import { type ReactNode, useMemo } from 'react'

import { UsecaseDepsProvider } from '../../_usecases/deps'

import { AppStateProvider, useAppState } from './AppStateContext'
import { AuthProvider } from './AuthContext'
import { bookRepo, historyRepo } from './repositories'

function UsecaseDepsBridge({ children }: { children: ReactNode }) {
  const { state } = useAppState()

  const deps = useMemo(
    () => ({
      bookRepo,
      historyRepo,
      location: state.location,
    }),
    [state.location],
  )

  return <UsecaseDepsProvider value={deps}>{children}</UsecaseDepsProvider>
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <AppStateProvider>
        <UsecaseDepsBridge>{children}</UsecaseDepsBridge>
      </AppStateProvider>
    </AuthProvider>
  )
}
