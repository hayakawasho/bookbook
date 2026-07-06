import { ListPlaceholder } from '../../../ui/ListPlaceholder'

import { getLibraryEmptyMessage } from './getLibraryEmptyMessage'
import { LibraryBookList } from './LibraryBookList'

import type { Book } from '../../../../_models/book'

type LibraryListBodyProps = {
  books: Book[]
  query: string
  isLoading: boolean
  error: unknown
}

export function LibraryListBody({ books, query, isLoading, error }: LibraryListBodyProps) {
  if (isLoading) {
    return <ListPlaceholder variant="loading" message="読み込み中…" />
  }

  if (error) {
    return <ListPlaceholder variant="error" message="データの取得に失敗しました" />
  }

  if (books.length === 0) {
    return <ListPlaceholder variant="empty" message={getLibraryEmptyMessage(query)} />
  }

  return <LibraryBookList books={books} />
}
