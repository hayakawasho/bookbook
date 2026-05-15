import { useState } from 'react'
import { useAppContext } from '../../../_states/AppContext'
import { Header } from '../../ui/Header'
import { BookItem, BookStockSummaryLines } from '../../model/book/BookItem'
import { SettingsScreen } from '../settings/SettingsScreen'
import { IconCog } from '../../ui/icon'

export function LibraryScreen() {
  const { state, bookRepo } = useAppContext()
  const [query, setQuery] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)

  const books = bookRepo.findMany(query, state.location)

  /* bookRepo はコンテキスト外のミュータブルなため、一覧の書籍が変わったときにこの画面へ反映させる */
  void state.books

  if (settingsOpen) {
    return <SettingsScreen onBack={() => setSettingsOpen(false)} />
  }

  return (
    <div className={`flex flex-col ${(books.length === 0) ? 'h-full' : ''}`}>
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
        <input
          id="library-search"
          className="w-full min-h-[44px] border-0 border-b border-border bg-transparent text-sm text-text outline-none search-input"
          type="search"
          autoComplete="off"
          placeholder="キーワード検索"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </div>
			{books.length === 0 ? (
				<div className="h-full grid items-center gap-2 text-sm text-center">
					<p className="text-sm">
						{query.trim() ? '該当する本がありません' : '本が登録されていません'}
	        </p>
				</div>
      ) : (
        <ul className="list-none m-0 p-0">
          {books.map(book => (
            <li key={book.isbn} className="border-b border-border first:border-t first:border-border">
              <BookItem
                book={book}
                action={<BookStockSummaryLines book={book} />}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
