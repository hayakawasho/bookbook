import { useState } from 'react'

import { Header } from '../../ui/Header'
import { IconCog } from '../../ui/icon'
import { useBookItems } from '../../usecase/book'
import { SettingsScreen } from '../settings'

import { LibraryListBody } from './_internal/LibraryListBody'
import { LibrarySearchBar } from './_internal/LibrarySearchBar'

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
      <LibrarySearchBar query={query} onChangeQuery={setQuery} />
      <LibraryListBody books={books} query={query} isLoading={isLoading} error={error} />
    </div>
  )
}
