import { createContext, type ReactNode, useContext, useEffect, useReducer, useRef } from 'react'

import { clamp } from '@bookbook/utils'

import {
  loadStoredLocation,
  persistLocation,
  persistThemeMode,
  resolveInitialThemeMode,
} from '../../_foundation/appPreferencesStorage'

import type { Location } from '../../_foundation/const'

export type AppTab = 'home' | 'library' | 'checkoutHistory'

export type ThemeMode = 'light' | 'dark'

type AppState = {
  location: Location
  activeTab: AppTab
  volume: number
  themeMode: ThemeMode
}

type AppAction =
  | { type: 'SET_LOCATION'; payload: Location }
  | { type: 'SET_TAB'; payload: AppTab }
  | { type: 'SET_VOLUME'; payload: number }
  | { type: 'SET_THEME_MODE'; payload: ThemeMode }

const initialState: AppState = {
  location: 'daikanyama',
  activeTab: 'home',
  volume: 70,
  themeMode: 'light',
}

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_LOCATION':
      return { ...state, location: action.payload }
    case 'SET_TAB':
      return { ...state, activeTab: action.payload }
    case 'SET_VOLUME':
      return { ...state, volume: clamp(action.payload, 0, 100) }
    case 'SET_THEME_MODE':
      return { ...state, themeMode: action.payload }
  }
}

type AppStateContextValue = {
  state: AppState
  dispatch: React.Dispatch<AppAction>
}

const AppStateContext = createContext<AppStateContextValue | null>(null)

function initAppState(base: AppState): AppState {
  return {
    ...base,
    location: loadStoredLocation() ?? base.location,
    themeMode: resolveInitialThemeMode(),
  }
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState, initAppState)
  const skipThemePersistOnMount = useRef(true)

  useEffect(() => {
    persistLocation(state.location)
  }, [state.location])

  useEffect(() => {
    if (skipThemePersistOnMount.current) {
      skipThemePersistOnMount.current = false
      return
    }
    persistThemeMode(state.themeMode)
  }, [state.themeMode])

  useEffect(() => {
    document.documentElement.dataset.theme = state.themeMode
  }, [state.themeMode])

  return <AppStateContext.Provider value={{ state, dispatch }}>{children}</AppStateContext.Provider>
}

export function useAppState(): AppStateContextValue {
  const ctx = useContext(AppStateContext)

  if (!ctx) {
    throw new Error('useAppState must be used within AppStateProvider')
  }
  return ctx
}
