import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  type ReactNode,
} from 'react'
import type { BookMetadata, HistoryMetadata } from '../_book/model'
import type { Location } from '../_foundation/const'
import { MockBookRepository } from '../_repositories/books/repository'
import { MockHistoryRepository } from '../_repositories/history/repository'

const bookRepo = new MockBookRepository()
const historyRepo = new MockHistoryRepository()

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

const initialState: AppState = {
  books: bookRepo.findAll(),
  history: historyRepo.findAll(),
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

    case 'ADD_BOOK': {
      bookRepo.add(action.payload)
      return { ...state, books: bookRepo.findAll() }
    }

    case 'ADD_COPY': {
      bookRepo.addCopy(action.payload.isbn)
      return { ...state, books: bookRepo.findAll() }
    }

    case 'CHECKOUT': {
      bookRepo.checkout(action.payload.isbn)
      const book = bookRepo.findByIsbn(action.payload.isbn)
      if (book) {
        historyRepo.createCheckout(book)
      }
      return {
        ...state,
        books: bookRepo.findAll(),
        history: historyRepo.findAll(),
      }
    }

    case 'RETURN': {
      historyRepo.markReturned(action.payload.historyId)
      bookRepo.returnBook(action.payload.isbn)
      return {
        ...state,
        books: bookRepo.findAll(),
        history: historyRepo.findAll(),
      }
    }

    default:
      return state
  }
}

type AppContextValue = {
  state: AppState
  dispatch: React.Dispatch<AppAction>
  bookRepo: MockBookRepository
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
    <AppContext.Provider value={{ state, dispatch, bookRepo }}>
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
