import { useState, useCallback } from 'react'
import type { BookMetadata } from '../../../_book/model'
import { useAppContext } from '../../../_states/app-context'
import { BookItem, BookStockSummaryLines } from '../../model/book/book-item'
import { BottomSheet } from '../../ui/bottom-sheet'
import { Dialog } from '../../ui/dialog'
import { Toast } from '../../ui/toast'
import { IconPlus } from '../../ui/icon'
import { SvgBookBook } from './svg-bookbook'
import noImageFallback from '../../../assets/no_image.png'

type SheetMode =
  | { kind: 'existing'; book: BookMetadata }
  | { kind: 'external'; book: Omit<BookMetadata, 'availableCount' | 'total'> }

type DialogConfig = {
  title: string
  message: string
  confirmLabel: string
  onConfirm: () => void
}

type ToastState = {
  message: string
  type: 'success' | 'error'
} | null

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

type HomeExistingBookSheetProps = {
  book: BookMetadata
  onAddCopy: (book: BookMetadata) => void
  onCheckout: (book: BookMetadata) => void
}

function HomeExistingBookSheet({ book, onAddCopy, onCheckout }: HomeExistingBookSheetProps) {
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
          追加<IconPlus size={13} />
        </button>
      </div>
      <div className="px-[22px] pb-8 pt-5 absolute bottom-0 w-full">
        <button
          type="button"
          className={`w-full min-h-[44px] px-5 border-0 text-sm font-semibold cursor-pointer ${canBorrow ? 'bg-primary text-primary-contrast' : 'bg-middle text-primary-contrast/80 cursor-not-allowed'}`}
          disabled={!canBorrow}
          onClick={() => onCheckout(book)}
        >
          本を借りる
        </button>
      </div>
    </>
  )
}

export function HomeScreen() {
  const { dispatch, bookRepo } = useAppContext()

  const [isbnInput, setIsbnInput] = useState('')
  const [notFound, setNotFound] = useState(false)
  const [sheetMode, setSheetMode] = useState<SheetMode | null>(null)
  const [dialogConfig, setDialogConfig] = useState<DialogConfig | null>(null)
  const [toast, setToast] = useState<ToastState>(null)

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type })
  }, [])

  const handleSearch = () => {
    const isbn = isbnInput.trim()
    setNotFound(false)
    setSheetMode(null)

    const existing = bookRepo.findByIsbn(isbn)
    
    if (existing) {
      setSheetMode({ kind: 'existing', book: existing })
      return
    }

    const external = bookRepo.fetchExternal(isbn)
    if (external) {
      setSheetMode({ kind: 'external', book: external })
      return
    }

    setNotFound(true)
  }

  const handleCheckout = (book: BookMetadata) => {
    setDialogConfig({
      title: '本を借りる',
      message: `「${book.title}」を借りますか？`,
      confirmLabel: '本を借りる',
      onConfirm: () => {
        dispatch({ type: 'CHECKOUT', payload: { isbn: book.isbn } })
        setDialogConfig(null)
        setSheetMode(null)
        setIsbnInput('')
        showToast('借りました', 'success')
      },
    })
  }

  const handleAddCopy = (book: BookMetadata) => {
    setDialogConfig({
      title: '冊数追加確認',
      message: `「${book.title}」を1冊追加しますか？`,
      confirmLabel: '追加する',
      onConfirm: () => {
        dispatch({ type: 'ADD_COPY', payload: { isbn: book.isbn } })
        setDialogConfig(null)
        setSheetMode(null)
        setIsbnInput('')
        showToast('冊数を追加しました', 'success')
      },
    })
  }

  const handleAddBook = (book: Omit<BookMetadata, 'availableCount' | 'total'>) => {
    setDialogConfig({
      title: '新規登録確認',
      message: `「${book.title}」をライブラリに登録しますか？`,
      confirmLabel: '登録する',
      onConfirm: () => {
        dispatch({
          type: 'ADD_BOOK',
          payload: { ...book, availableCount: 1, total: 1 },
        })
        setDialogConfig(null)
        setSheetMode(null)
        setIsbnInput('')
        showToast('登録しました', 'success')
      },
    })
  }

  return (
    <div className="min-h-full grid h-[stretch] bg-background pt-[env(safe-area-inset-top,0px)]">
      <div className="flex-1 flex flex-col min-h-[min(45vh,320px)] bg-[#2B2E31] relative">
        <div className="flex-1 flex flex-col items-stretch justify-center px-[22px] py-6 gap-4">
          <div
            className="w-full border-[10px] border-accent box-border shrink-0"
            style={{ minHeight: 'min(132px, 28vw)' }}
          >
            <div className="flex flex-col gap-3 p-4 bg-black/35">
              <div className="flex gap-2 items-stretch min-[360px]:flex-row flex-col">
                <input
                  className="flex-1 min-h-[44px] px-0 py-2 border-0 border-b border-border bg-transparent text-sm text-primary-contrast placeholder:text-middle outline-none isbn-input"
                  type="text"
                  inputMode="numeric"
                  placeholder="ISBNを入力（例: 9784873119038）"
                  value={isbnInput}
                  onChange={e => {
                    setIsbnInput(e.target.value)
                    setNotFound(false)
                  }}
                  maxLength={13}
                />
                <button
                  className="inline-flex items-center justify-center min-h-[44px] px-5 bg-primary-contrast text-primary border-0 text-sm font-semibold cursor-pointer whitespace-nowrap disabled:bg-middle disabled:text-primary-contrast/70 disabled:cursor-not-allowed shrink-0"
                  onClick={handleSearch}
                  disabled={isbnInput.trim().length === 0}
                >
                  読み取り
                </button>
              </div>
              {notFound && (
                <p className="m-0 text-xs text-error">見つかりませんでした</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="relative overflow-hidden bg-surface px-[22px] pt-[20px] pb-[105px] shrink-0 z-[1] -mt-5 rounded-t-[20px] shadow-[0_-10px_32px_rgba(0,0,0,0.12)] flex flex-col items-center gap-5 border-0">
				<div className="w-full h-[stretch] grid items-center">
					<div>
						<h1 className="m-0 text-center text-[30px] font-bold leading-[38px] text-text tracking-normal">
	            Scan Barcode
	          </h1>
	          <p className="m-0 mt-3 text-center text-xs leading-[17px] px-2">
	            『978』から始まる本のバーコードを読み取ろう！
	          </p>
					</div>
        </div>
        <div className="absolute translate-y-full bottom-[105px]">
          <SvgBookBook />
        </div>
      </div>

      <BottomSheet open={sheetMode !== null} onClose={() => setSheetMode(null)}>
        {sheetMode?.kind === 'existing' && (
          <HomeExistingBookSheet
            book={sheetMode.book}
            onAddCopy={handleAddCopy}
            onCheckout={handleCheckout}
          />
        )}
        {sheetMode?.kind === 'external' && (
          <div className="px-[22px] pb-8 pt-4">
            <BookItem book={{ ...sheetMode.book, availableCount: 0, total: 0 }} />
            <p className="m-0 mb-4 text-sm text-text">この本を1冊登録しますか？</p>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                className="inline-flex items-center justify-center min-h-[44px] px-5 bg-primary text-primary-contrast border-0 text-sm font-semibold cursor-pointer whitespace-nowrap disabled:bg-middle disabled:cursor-not-allowed w-full"
                onClick={() => handleAddBook(sheetMode.book)}
              >
                登録する
              </button>
            </div>
          </div>
        )}
      </BottomSheet>

      {dialogConfig && (
        <Dialog
          title={dialogConfig.title}
          message={dialogConfig.message}
          confirmLabel={dialogConfig.confirmLabel}
          cancelLabel="キャンセル"
          onConfirm={dialogConfig.onConfirm}
          onCancel={() => setDialogConfig(null)}
        />
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  )
}
