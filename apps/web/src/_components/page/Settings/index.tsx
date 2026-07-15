import { useState } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router'

import { useAppState, useAuth } from '../../app'
import { Dialog } from '../../ui/Dialog'

import { LocationSettingsScreen } from './_internal/LocationSettingsScreen'
import { SettingsMainView } from './_internal/SettingsMainView'
import { useBackWithFallback } from './_internal/useBackWithFallback'
import { VolumeSettingsScreen } from './_internal/VolumeSettingsScreen'

import type { Location } from '../../../_foundation/const'

export function SettingsScreen() {
  const { state, dispatch } = useAppState()
  const { currentUser, logout } = useAuth()
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)
  const navigate = useNavigate()
  const back = useBackWithFallback()

  const handleSelectLocation = (location: Location) => {
    dispatch({ type: 'SET_LOCATION', payload: location })
    back('/settings')
  }

  return (
    <Routes>
      <Route
        path="location"
        element={
          <LocationSettingsScreen
            currentLocation={state.location}
            onBack={() => back('/settings')}
            onSelectLocation={handleSelectLocation}
          />
        }
      />
      <Route path="volume" element={<VolumeSettingsScreen onBack={() => back('/settings')} />} />
      <Route
        index
        element={
          <>
            <SettingsMainView
              currentLocation={state.location}
              isDarkTheme={state.themeMode === 'dark'}
              user={currentUser}
              onBack={() => back('/')}
              onOpenLocation={() => navigate('/settings/location')}
              onOpenVolume={() => navigate('/settings/volume')}
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
        }
      />
      <Route path="*" element={<Navigate to="/settings" replace />} />
    </Routes>
  )
}
