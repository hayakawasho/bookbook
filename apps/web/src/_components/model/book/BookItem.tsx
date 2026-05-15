import type { ReactNode } from 'react'
import type { BookMetadata } from '../../../_book/model'
import { BookCover } from './BookCover'

type BookItemProps = {
  book: BookMetadata
  /** タイトルより上に置くメタ情報（貸出日など） */
  prependMeta?: ReactNode
  action?: ReactNode
}

export function BookStockSummaryLines({ book }: { book: BookMetadata }) {
  const isBorrowable = book.availableCount > 0;

  return (
    <div className="flex flex-col gap-1">
      <p
        className={`m-0 text-xs leading-[17px] font-bold ${isBorrowable ? 'text-success' : 'text-error'}`}
      >
        {isBorrowable ? '貸出可：〇' : '貸出中：×'}
      </p>
      <p className="m-0 text-xs leading-[17px] text-text-muted">総冊数：{book.total}</p>
    </div>
  )
}

export function BookItem({ book, prependMeta, action }: BookItemProps) {
  return (
    <div className="flex gap-[29px] px-[22px] py-8 items-start">
      <div className="shrink-0 w-[103px]">
        <BookCover src={book.cover.src} alt={book.title} />
      </div>
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        {prependMeta}
        <p className="m-0 text-sm font-semibold leading-[22px] text-text break-words">{book.title}</p>
        {book.author && (
          <p className="m-0 text-xs leading-[17px] text-text-muted">{book.author}</p>
        )}
        {book.publisher && (
          <p className="m-0 text-xs leading-[17px] text-text-muted">{book.publisher}</p>
        )}
        {action && <div className="mt-2 w-full min-w-0">{action}</div>}
      </div>
    </div>
  )
}
