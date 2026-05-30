import { Book } from '../../../_models/book'
import type { ExternalBookInfo } from '../../../_repositories/books/interface'
import { IconPlus } from '../../ui/icon'
import { BookCover } from '../../usecase/book/BookCover'
import { BookItem, BookStockSummaryLines } from '../../usecase/book/BookItem'

type HomeExistingBookSheetProps = {
  book: Book
  onAddCopy: (book: Book) => void
  onCheckout: (book: Book) => void
}

type HomeExternalBookSheetProps = {
  book: ExternalBookInfo
  onAddBook: (book: ExternalBookInfo) => void | Promise<void>
}

export function HomeExistingBookSheet({ book, onAddCopy, onCheckout }: HomeExistingBookSheetProps) {
  const hasAvailableStock = Book.hasAvailableStock(book)
  const attributionLabel = book.publisher ?? book.author
  const checkoutButtonClass = hasAvailableStock
    ? 'bg-primary text-primary-contrast'
    : 'bg-middle text-primary-contrast/80 cursor-not-allowed'

  return (
    <>
      <div className="flex gap-[29px] items-start px-[22px] pt-8 pb-2">
        <BookCover src={book.cover.src} alt="" />
        <div className="flex-1 min-w-0 flex flex-col gap-2 pt-0.5">
          <p className="m-0 text-sm font-semibold leading-[22px] text-text break-words">
            {book.title}
          </p>
          {attributionLabel && (
            <p className="m-0 text-xs leading-[17px] text-text-muted">{attributionLabel}</p>
          )}
          <BookStockSummaryLines book={book} />
        </div>
        <button
          type="button"
          className="shrink-0 min-h-[40px] h-fit mt-1 px-2.5 py-2 bg-surface text-text text-xs font-semibold tracking-tight cursor-pointer inline-flex items-center gap-1.5"
          onClick={() => onAddCopy(book)}
        >
          追加
          <IconPlus size={13} className="w-[1em] f-[1em] text-[.75em]" />
        </button>
      </div>
      <div className="px-[22px] pb-8 pt-5 absolute bottom-0 w-full">
        <button
          type="button"
          className={`w-full min-h-[56px] px-5 border-0 text-sm font-semibold cursor-pointer ${checkoutButtonClass}`}
          disabled={!hasAvailableStock}
          onClick={() => onCheckout(book)}
        >
          本を借りる
        </button>
      </div>
    </>
  )
}

export function HomeExternalBookSheet({ book, onAddBook }: HomeExternalBookSheetProps) {
  return (
    <>
      <div className="flex gap-[29px] items-start px-[22px] pt-0 pb-2">
        <BookItem book={book} />
      </div>
      <div className="px-[22px] pb-8 pt-5 absolute bottom-0 w-full">
        <button
          type="button"
          className="inline-flex items-center justify-center min-h-[56px] px-5 bg-primary text-primary-contrast border-0 text-sm font-semibold cursor-pointer whitespace-nowrap disabled:bg-middle disabled:cursor-not-allowed w-full"
          onClick={() => {
            onAddBook(book)
          }}
        >
          新規追加
        </button>
      </div>
    </>
  )
}
