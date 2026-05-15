import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  type ReactNode,
} from 'react'
import type { BookMetadata, HistoryMetadata } from '../_book/model'
import type { BarcodeScannerAdapter } from '../_foundation/barcodeScannerAdapter'
import { MockBarcodeScannerAdapter } from '../_foundation/barcodeScannerAdapter'
import { Html5QrcodeScannerAdapter } from '../_adapters/html5-qrcode/html5QrcodeScannerAdapter'
import type { Location } from '../_foundation/const'
import { MockNotificationGateway } from '../_foundation/notificationGateway'
import type { NotificationGateway } from '../_foundation/notificationGateway'
import type { BookRepository } from '../_repositories/books/interface'
import { MockBookRepository } from '../_repositories/books/repository'
import type { HistoryRepository } from '../_repositories/history/interface'
import { MockHistoryRepository } from '../_repositories/history/repository'

const bookRepo: BookRepository = new MockBookRepository()
const historyRepo: HistoryRepository = new MockHistoryRepository(bookRepo)
const notificationGateway: NotificationGateway = new MockNotificationGateway()
const barcodeScanner: BarcodeScannerAdapter =
  typeof window !== 'undefined'
    ? new Html5QrcodeScannerAdapter()
    : new MockBarcodeScannerAdapter()

export type AppTab = 'home' | 'library' | 'checkoutHistory'

export type ThemeMode = 'light' | 'dark'

type AppState = {
  books: BookMetadata[]
  history: HistoryMetadata[]
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
  | { type: 'ADD_BOOK'; payload: BookMetadata }
  | { type: 'ADD_COPY'; payload: { isbn: string } }
  | { type: 'CHECKOUT'; payload: { isbn: string } }
  | { type: 'RETURN'; payload: { historyId: string; isbn: string } }

const initialLocation: Location = 'daikanyama'

const initialState: AppState = {
  books: bookRepo.findMany('', initialLocation),
  history: historyRepo.findMany({}, initialLocation),
  location: initialLocation,
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

    case 'ADD_BOOK': {
      const { availableCount: _ac, total: _to, ...external } = action.payload
      bookRepo.create(external, state.location)
      const created = bookRepo.findByIsbn(action.payload.isbn, state.location)
      if (created.status === 'registered') {
        notificationGateway.notify('new-book', state.location, created.book)
      }
      return { ...state, books: bookRepo.findMany('', state.location) }
    }

    case 'ADD_COPY': {
      bookRepo.updateCount(action.payload.isbn, 'add-copy', state.location)
      return { ...state, books: bookRepo.findMany('', state.location) }
    }

    case 'CHECKOUT': {
      bookRepo.updateCount(action.payload.isbn, 'checkout', state.location)
      historyRepo.createCheckout(action.payload.isbn, state.location)
      const afterBook = bookRepo.findByIsbn(action.payload.isbn, state.location)
      if (afterBook.status === 'registered') {
        notificationGateway.notify('checkout', state.location, afterBook.book)
      }
      return {
        ...state,
        books: bookRepo.findMany('', state.location),
        history: historyRepo.findMany({}, state.location),
      }
    }

    case 'RETURN': {
      historyRepo.markReturned(
        action.payload.historyId,
        action.payload.isbn,
        state.location,
      )
      bookRepo.updateCount(action.payload.isbn, 'return', state.location)
      const returnedBook = bookRepo.findByIsbn(action.payload.isbn, state.location)
      if (returnedBook.status === 'registered') {
        notificationGateway.notify('return', state.location, returnedBook.book)
      }
      return {
        ...state,
        books: bookRepo.findMany('', state.location),
        history: historyRepo.findMany({}, state.location),
      }
    }

    default:
      return state
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

function syncDocumentTheme(mode: ThemeMode) {
  document.documentElement.dataset.theme = mode
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState)

  useEffect(() => {
    syncDocumentTheme(state.themeMode)
  }, [state.themeMode])

  return (
    <AppContext.Provider
      value={{
        state,
        dispatch,
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
