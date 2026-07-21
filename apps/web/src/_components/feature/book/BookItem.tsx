import { Book } from '../../../_models/book'

import { BookCover } from './BookCover'

import type { ReactNode } from 'react'

export type BookView = Pick<Book, 'title' | 'author' | 'publisher' | 'cover'>

type BookItemProps = {
  book: BookView
  cover?: ReactNode
  prependMeta?: ReactNode
  action?: ReactNode
}

export function BookStockSummaryLines({ book }: { book: Book }) {
  const hasAvailableStock = Book.hasAvailableStock(book)

  return (
    <div className="flex flex-col gap-1">
      <p className={`m-0 text-xs font-bold ${hasAvailableStock ? 'text-success' : 'text-error'}`}>
        {hasAvailableStock ? '貸出可：〇' : '貸出中：×'}
      </p>
      <p className="m-0 text-xs text-text-muted">総冊数：{book.total}</p>
    </div>
  )
}

export function BookItem({ book, cover, prependMeta, action }: BookItemProps) {
  return (
    <div className="flex gap-[29px] px-[22px] py-8 items-start">
      <div className="shrink-0 w-[103px]">
        {cover ?? <BookCover src={book.cover.src} alt={book.title} />}
      </div>
      <div className="flex-1 min-w-0 flex flex-col gap-2">
        {prependMeta}
        <p className="m-0 text-sm font-semibold leading-[22px] text-text break-words">
          {book.title}
        </p>
        <div className='grid gap-1'>
          {book.author && <p className="m-0 text-xs leading-[17px] text-text-muted">{book.author}</p>}
          {book.publisher && (
            <p className="m-0 text-xs leading-[17px] text-text-muted">{book.publisher}</p>
          )}
        </div>
        {action && <div className="mt-2 w-full min-w-0">{action}</div>}
      </div>
    </div>
  )
}
