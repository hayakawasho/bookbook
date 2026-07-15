import { type ReactNode, useMemo } from 'react'

import { UsecaseDepsProvider } from '../../_usecases/deps'

import { AppStateProvider, useAppState } from './AppStateContext'
import { AuthProvider } from './AuthContext'

import type { AppConfig } from './config'
import type { Repositories } from './repositories'

function UsecaseDepsBridge({
  repositories,
  children,
}: {
  repositories: Repositories
  children: ReactNode
}) {
  const { state } = useAppState()

  const deps = useMemo(
    () => ({
      ...repositories,
      location: state.location,
    }),
    [repositories, state.location],
  )

  return <UsecaseDepsProvider value={deps}>{children}</UsecaseDepsProvider>
}

export function AppProviders({
  config,
  repositories,
  children,
}: {
  config: AppConfig
  repositories: Repositories
  children: ReactNode
}) {
  const authMode = config.profile === 'production' ? 'http' : 'mock'

  return (
    <AuthProvider mode={authMode} apiBase={config.apiBase}>
      <AppStateProvider>
        <UsecaseDepsBridge repositories={repositories}>{children}</UsecaseDepsBridge>
      </AppStateProvider>
    </AuthProvider>
  )
}
