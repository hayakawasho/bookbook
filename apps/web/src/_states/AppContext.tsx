import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  type ReactNode,
} from 'react'
import type { BarcodeScannerAdapter } from '../_foundation/barcodeScannerAdapter'
import { MockBarcodeScannerAdapter } from '../_foundation/barcodeScannerAdapter'
import { Html5QrcodeScannerAdapter } from '../_adapters/html5-qrcode/html5QrcodeScannerAdapter'
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
  bookRepo: BookRepository
  historyRepo: HistoryRepository
  notificationGateway: NotificationGateway
  barcodeScanner: BarcodeScannerAdapter
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState)

  useEffect(() => {
    document.documentElement.dataset.theme = state.themeMode
  }, [state.themeMode])

  return (
    <AppContext.Provider
      value={{ state, dispatch, bookRepo, historyRepo, notificationGateway, barcodeScanner }}
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
