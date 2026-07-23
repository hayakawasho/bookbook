import { useState } from 'react'
import { useNavigate } from 'react-router'

import { useBookItems } from '../../../_usecases/book'
import { Header } from '../../ui/Header'
import { IconCog } from '../../ui/icon'

import { LibraryListBody } from './_internal/LibraryListBody'
import { LibrarySearchBar } from './_internal/LibrarySearchBar'

export function LibraryScreen() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  const { data, isLoading, error } = useBookItems(query)

  // 再検証中でも保持データがあれば表示し続ける（キャッシュ破棄+再検証によるちらつき防止）
  const books = data ?? []
  const showLoading = isLoading && data === undefined

  const isEmptyLayout = books.length === 0

  return (
    <div className={`flex flex-col ${isEmptyLayout ? 'h-full' : ''}`}>
      <Header
        title="本棚"
        rightAction={
          <button
            type="button"
            className="flex items-center justify-center w-[44px] h-[44px] bg-transparent border-0 cursor-pointer text-primary p-0"
            onClick={() => navigate('/settings')}
            aria-label="設定"
          >
            <IconCog size={22} />
          </button>
        }
      />
      <LibrarySearchBar query={query} onChangeQuery={setQuery} />
      <LibraryListBody books={books} query={query} isLoading={showLoading} error={error} />
    </div>
  )
}
