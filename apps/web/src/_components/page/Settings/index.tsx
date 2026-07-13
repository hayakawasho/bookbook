import { useState } from 'react'

import { useAppState, useAuth } from '../../app'
import { Dialog } from '../../ui/Dialog'

import { LocationSettingsScreen } from './_internal/LocationSettingsScreen'
import { SettingsMainView } from './_internal/SettingsMainView'
import { VolumeSettingsScreen } from './_internal/VolumeSettingsScreen'

import type { Location } from '../../../_foundation/const'
import type { SettingsView } from './types'

type SettingsScreenProps = {
  onBack: () => void
}

export function SettingsScreen({ onBack }: SettingsScreenProps) {
  const { state, dispatch } = useAppState()
  const { currentUser, logout } = useAuth()
  const [view, setView] = useState<SettingsView>('main')
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)

  const handleRootBack = () => {
    if (view === 'main') {
      onBack()
      return
    }
    setView('main')
  }

  const handleSelectLocation = (location: Location) => {
    dispatch({ type: 'SET_LOCATION', payload: location })
    setView('main')
  }

  if (view === 'location') {
    return (
      <LocationSettingsScreen
        currentLocation={state.location}
        onBack={() => setView('main')}
        onSelectLocation={handleSelectLocation}
      />
    )
  }

  if (view === 'volume') {
    return <VolumeSettingsScreen onBack={() => setView('main')} />
  }

  return (
    <>
      <SettingsMainView
        currentLocation={state.location}
        isDarkTheme={state.themeMode === 'dark'}
        user={currentUser}
        onBack={handleRootBack}
        onOpenLocation={() => setView('location')}
        onOpenVolume={() => setView('volume')}
        onToggleTheme={() =>
          dispatch({
            type: 'SET_THEME_MODE',
            payload: state.themeMode === 'dark' ? 'light' : 'dark',
          })
        }
        onLogout={() => setLogoutConfirmOpen(true)}
      />
      {logoutConfirmOpen && (
        <Dialog
          message="ログアウトしますか？"
          confirmLabel="ログアウト"
          cancelLabel="キャンセル"
          onConfirm={async () => {
            setLogoutConfirmOpen(false)
            await logout()
          }}
          onCancel={() => setLogoutConfirmOpen(false)}
        />
      )}
    </>
  )
}
