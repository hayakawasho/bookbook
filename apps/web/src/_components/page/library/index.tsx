import { useState } from 'react'
import type { Book } from '../../../_models/book'
import { useBookItems } from '../../usecase/book'
import { Header } from '../../ui/Header'
import { BookItem, BookStockSummaryLines } from '../../usecase/book/BookItem'
import { SettingsScreen } from '../settings'
import { IconCog, IconSearch } from '../../ui/icon'

function getLibraryEmptyMessage(query: string): string {
  const hasQuery = query.trim().length > 0

  if (hasQuery) {
    return `『${query}』に関連する本は見つかりませんでした`
  }

  return '本が登録されていません'
}

function LibraryLoadingState() {
  return (
    <div className="h-full grid items-center">
      <p className="text-sm text-center text-text-muted">読み込み中…</p>
    </div>
  )
}

function LibraryErrorState() {
  return (
    <div className="h-full grid items-center">
      <p className="text-sm text-center text-error">データの取得に失敗しました</p>
    </div>
  )
}

function LibraryEmptyState({ message }: { message: string }) {
  return (
    <div className="h-full grid items-center gap-2 text-sm text-center">
      <p className="text-sm">{message}</p>
    </div>
  )
}

function LibraryBookList({ books }: { books: Book[] }) {
  return (
    <ul className="list-none m-0 p-0">
      {books.map(book => (
        <li key={String(book.id)} className="border-b border-border first:border-t first:border-border">
          <BookItem book={book} action={<BookStockSummaryLines book={book} />} />
        </li>
      ))}
    </ul>
  )
}

type LibraryBodyProps = {
  books: Book[]
  query: string
  isLoading: boolean
  error: unknown
}

function LibraryBody({ books, query, isLoading, error }: LibraryBodyProps) {
  if (isLoading) {
    return <LibraryLoadingState />
  }

  if (error) {
    return <LibraryErrorState />
  }

  if (books.length === 0) {
    return <LibraryEmptyState message={getLibraryEmptyMessage(query)} />
  }

  return <LibraryBookList books={books} />
}

export function LibraryScreen() {
  const [query, setQuery] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)

  const { data: books = [], isLoading, error } = useBookItems(query)

  if (settingsOpen) {
    return <SettingsScreen onBack={() => setSettingsOpen(false)} />
  }

  const isEmptyLayout = books.length === 0

  return (
    <div className={`flex flex-col ${isEmptyLayout ? 'h-full' : ''}`}>
      <Header
        title="本棚"
        rightAction={
          <button
            type="button"
            className="flex items-center justify-center w-[44px] h-[44px] bg-transparent border-0 cursor-pointer text-primary p-0"
            onClick={() => setSettingsOpen(true)}
            aria-label="設定"
          >
            <IconCog size={22} />
          </button>
        }
      />
      <div className="px-[22px] py-3 bg-surface border-b border-border shrink-0 sticky top-0">
        <label className="sr-only" htmlFor="library-search">
          本棚を検索
        </label>
        <div className="flex items-center gap-2 relative">
          <IconSearch size={22} className="absolute text-text-muted" />
          <input
            id="library-search"
            className="w-full min-h-[44px] border-0 border-b border-border bg-transparent text-sm text-text outline-none search-input pl-[30px]"
            type="search"
            autoComplete="off"
            placeholder="探す"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
      </div>

      <LibraryBody books={books} query={query} isLoading={isLoading} error={error} />
    </div>
  )
}
