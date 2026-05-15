import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { BarcodeScannerAdapter } from '../_foundation/barcodeScannerAdapter'
import { MockBarcodeScannerAdapter } from '../_foundation/barcodeScannerAdapter'
import { Html5QrcodeScannerAdapter } from '../_adapters/html5-qrcode/html5QrcodeScannerAdapter'
import {
  loadStoredLocation,
  persistLocation,
  persistThemeMode,
  resolveInitialThemeMode,
} from '../_foundation/appPreferencesStorage'
import type { Location } from '../_foundation/const'
import { HttpNotificationGateway } from '../_foundation/httpNotificationGateway'
import { MockNotificationGateway } from '../_foundation/notificationGateway'
import type { NotificationGateway } from '../_foundation/notificationGateway'
import type { BookRepository } from '../_repositories/books/interface'
import { HttpBookRepository } from '../_repositories/books/httpRepository'
import { MockBookRepository } from '../_repositories/books/repository'
import type { HistoryRepository } from '../_repositories/history/interface'
import { HttpHistoryRepository } from '../_repositories/history/httpRepository'
import { MockHistoryRepository } from '../_repositories/history/repository'

const USE_HTTP_API = import.meta.env.VITE_USE_HTTP_API === 'true'
const API_BASE = '/api'

const bookRepo: BookRepository = USE_HTTP_API
  ? new HttpBookRepository(API_BASE)
  : new MockBookRepository()

const historyRepo: HistoryRepository = USE_HTTP_API
  ? new HttpHistoryRepository(API_BASE)
  : new MockHistoryRepository(bookRepo)

const notificationGateway: NotificationGateway = USE_HTTP_API
  ? new HttpNotificationGateway(API_BASE)
  : new MockNotificationGateway()

const barcodeScanner: BarcodeScannerAdapter =
  typeof window !== 'undefined'
    ? new Html5QrcodeScannerAdapter()
    : new MockBarcodeScannerAdapter()

export type AppTab = 'home' | 'library' | 'checkoutHistory'

export type ThemeMode = 'light' | 'dark'

export type CurrentUser = {
  email: string
  name?: string
}

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

function clampVolume(n: number): number {
  return Math.min(100, Math.max(0, Math.round(n)))
}

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_LOCATION':
      return { ...state, location: action.payload }
    case 'SET_TAB':
      return { ...state, activeTab: action.payload }
    case 'SET_VOLUME':
      return { ...state, volume: clampVolume(action.payload) }
    case 'SET_THEME_MODE':
      return { ...state, themeMode: action.payload }
  }
}

type AppContextValue = {
  state: AppState
  dispatch: React.Dispatch<AppAction>
  currentUser: CurrentUser | null
  authLoading: boolean
  login: () => void
  logout: () => void | Promise<void>
  bookRepo: BookRepository
  historyRepo: HistoryRepository
  notificationGateway: NotificationGateway
  barcodeScanner: BarcodeScannerAdapter
}

const AppContext = createContext<AppContextValue | null>(null)

function initAppState(base: AppState): AppState {
  return {
    ...base,
    location: loadStoredLocation() ?? base.location,
    themeMode: resolveInitialThemeMode(),
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState, initAppState)
  const skipThemePersistOnMount = useRef(true)
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(() =>
    USE_HTTP_API ? null : { email: 'mock@local.dev', name: 'Mock' },
  )
  const [authLoading, setAuthLoading] = useState(() => USE_HTTP_API)

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

  useEffect(() => {
    if (!USE_HTTP_API) {
      return
    }
    let cancelled = false
    ;(async () => {
      setAuthLoading(true)
      try {
        const res = await fetch(`${API_BASE}/auth/me`, { credentials: 'include' })
        if (cancelled) return
        if (res.ok) {
          const data = (await res.json()) as {
            user: { email: string; name: string | null }
          }
          setCurrentUser({
            email: data.user.email,
            name: data.user.name ?? undefined,
          })
        } else {
          setCurrentUser(null)
        }
      } catch {
        if (!cancelled) setCurrentUser(null)
      } finally {
        if (!cancelled) setAuthLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const login = () => {
    window.location.href = '/api/auth/google/start'
  }

  const logout = async () => {
    if (!USE_HTTP_API) return
    try {
      await fetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'include' })
    } catch {
      /* network errors: still clear local session UX */
    }
    setCurrentUser(null)
  }

  return (
    <AppContext.Provider
      value={{
        state,
        dispatch,
        currentUser,
        authLoading,
        login,
        logout,
        bookRepo,
        historyRepo,
        notificationGateway,
        barcodeScanner,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) {
    throw new Error('useAppContext must be used within AppProvider')
  }
  return ctx
}
