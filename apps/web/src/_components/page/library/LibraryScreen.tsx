import { useState } from 'react'
import { useBookItems } from '../../../_book/usecase'
import { Header } from '../../ui/Header'
import { BookItem, BookStockSummaryLines } from '../../model/book/BookItem'
import { SettingsScreen } from '../settings/SettingsScreen'
import { IconCog, IconSearch } from '../../ui/icon'

export function LibraryScreen() {
  const [query, setQuery] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)

  const { data: books = [], isLoading, error } = useBookItems(query)

  if (settingsOpen) {
    return <SettingsScreen onBack={() => setSettingsOpen(false)} />
  }

  return (
    <div className={`flex flex-col ${books.length === 0 ? 'h-full' : ''}`}>
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
				<div className='flex items-center gap-2 relative'>
					<IconSearch size={22} className='absolute text-text-muted' />
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

      {isLoading ? (
        <div className="h-full grid items-center">
          <p className="text-sm text-center text-text-muted">読み込み中…</p>
        </div>
      ) : error ? (
        <div className="h-full grid items-center">
          <p className="text-sm text-center text-error">データの取得に失敗しました</p>
        </div>
      ) : books.length === 0 ? (
        <div className="h-full grid items-center gap-2 text-sm text-center">
          <p className="text-sm">
            {query.trim() ? '該当する本がありません' : '本が登録されていません'}
          </p>
        </div>
      ) : (
        <ul className="list-none m-0 p-0">
          {books.map(book => (
            <li key={book.isbn} className="border-b border-border first:border-t first:border-border">
              <BookItem book={book} action={<BookStockSummaryLines book={book} />} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
