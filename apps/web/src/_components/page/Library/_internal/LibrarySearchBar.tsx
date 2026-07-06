import { IconSearch } from '../../../ui/icon'

type LibrarySearchBarProps = {
  query: string
  onChangeQuery: (value: string) => void
}

export function LibrarySearchBar({ query, onChangeQuery }: LibrarySearchBarProps) {
  return (
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
          onChange={(e) => onChangeQuery(e.target.value)}
        />
      </div>
    </div>
  )
}
