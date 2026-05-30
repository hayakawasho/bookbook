import { BookItem, BookStockSummaryLines } from '../../../usecase/book/BookItem'

import type { Book } from '../../../../_models/book'

type LibraryBookListProps = {
  books: Book[]
}

export function LibraryBookList({ books }: LibraryBookListProps) {
  return (
    <ul className="list-none m-0 p-0">
      {books.map((book) => (
        <li
          key={String(book.id)}
          className="border-b border-border first:border-t first:border-border"
        >
          <BookItem book={book} action={<BookStockSummaryLines book={book} />} />
        </li>
      ))}
    </ul>
  )
}
