import type { BookMetadata } from '../../../_book/model'
import type { ExternalBookInfo } from '../../../_repositories/books/interface'
import { BookItem, BookStockSummaryLines } from '../../model/book/BookItem'
import { IconPlus } from '../../ui/icon'
import noImageFallback from '../../../assets/no_image.png'

type HomeExistingBookSheetProps = {
  book: BookMetadata
  onAddCopy: (book: BookMetadata) => void
  onCheckout: (book: BookMetadata) => void
}

type HomeExternalBookSheetProps = {
  book: ExternalBookInfo
  onAddBook: (book: ExternalBookInfo) => void
}

function HomeSheetThumb({ book }: { book: BookMetadata }) {
  if (!book.cover.src) {
    return (
      <img
        src={noImageFallback}
        alt=""
        width={103}
        height={145}
        className="w-[103px] h-[145px] object-cover shrink-0 bg-border border-0 block"
        draggable={false}
        role="presentation"
      />
    )
  }

  return (
    <img
      src={book.cover.src}
      alt=""
      width={103}
      height={145}
      className="w-[103px] h-[145px] object-cover shrink-0 bg-border border-0 block"
    />
  )
}

export function HomeExistingBookSheet({
  book,
  onAddCopy,
  onCheckout,
}: HomeExistingBookSheetProps) {
  const canBorrow = book.availableCount > 0
  const attributionLabel = book.publisher ?? book.author

  return (
    <>
      <div className="flex gap-[29px] items-start px-[22px] pt-8 pb-2">
        <HomeSheetThumb book={book} />
        <div className="flex-1 min-w-0 flex flex-col gap-2 pt-0.5">
          <p className="m-0 text-sm font-semibold leading-[22px] text-text break-words">{book.title}</p>
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
          追加<IconPlus size={13} className="w-[1em] f-[1em] text-[.75em]" />
        </button>
      </div>
      <div className="px-[22px] pb-8 pt-5 absolute bottom-0 w-full">
        <button
          type="button"
          className={`w-full min-h-[56px] px-5 border-0 text-sm font-semibold cursor-pointer ${canBorrow ? 'bg-primary text-primary-contrast' : 'bg-middle text-primary-contrast/80 cursor-not-allowed'}`}
          disabled={!canBorrow}
          onClick={() => onCheckout(book)}
        >
          本を借りる
        </button>
      </div>
    </>
  )
}

export function HomeExternalBookSheet({
  book,
  onAddBook,
}: HomeExternalBookSheetProps) {
  return (
    <div className="px-[22px] pb-8 pt-4">
      <BookItem book={{ ...book, availableCount: 0, total: 0 }} />
      <p className="m-0 mb-4 text-sm text-text">この本を1冊登録しますか？</p>
      <div className="flex flex-col gap-3">
        <button
          type="button"
          className="inline-flex items-center justify-center min-h-[44px] px-5 bg-primary text-primary-contrast border-0 text-sm font-semibold cursor-pointer whitespace-nowrap disabled:bg-middle disabled:cursor-not-allowed w-full"
          onClick={() => onAddBook(book)}
        >
          登録する
        </button>
      </div>
    </div>
  )
}
