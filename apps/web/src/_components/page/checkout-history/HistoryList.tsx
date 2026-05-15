import type { HistoryMetadata } from '../../../_book/model'
import { BookItem } from '../../model/book/BookItem'
import type { HistorySubTab } from './types'

type HistoryListProps = {
  borrowing: HistoryMetadata[]
  returned: HistoryMetadata[]
  activeTab: HistorySubTab
  onReturn: (history: HistoryMetadata) => void
}

function formatLoanDate(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}.${m}.${d}`
}

function BorrowingEmptyState() {
  return (
    <div className="h-full grid items-center text-sm text-center">
      <p className="">
        現在本を借りていません
        <span className="block text-text-muted mt-2">いますぐ本棚を覗いてみよう！</span>
      </p>
    </div>
  )
}

function ReturnedEmptyState() {
  return (
    <div className="h-full grid items-center gap-2 text-sm text-center">
      <p className="text-sm text-text-muted">社内の本を借りてみよう！</p>
    </div>
  )
}

function BorrowingList({
  borrowing,
  onReturn,
}: Pick<HistoryListProps, 'borrowing' | 'onReturn'>) {
  if (borrowing.length === 0) {
    return <BorrowingEmptyState />
  }

  return (
    <ul className="list-none m-0 p-0">
      {borrowing.map(h => (
        <li key={h.historyId} className="border-b border-border first:border-t first:border-border">
          <BookItem
            book={h}
            prependMeta={
              <p className="m-0 mb-1 text-xs leading-[17px]">
                貸出日：{formatLoanDate(h.checkoutDate)}
              </p>
            }
            action={
              <button
                type="button"
                className="w-full min-h-[36px] px-4 bg-primary text-primary-contrast border-0 text-xs font-semibold cursor-pointer"
                onClick={() => onReturn(h)}
              >
                返却
              </button>
            }
          />
        </li>
      ))}
    </ul>
  )
}

function ReturnedList({ returned }: Pick<HistoryListProps, 'returned'>) {
  if (returned.length === 0) {
    return <ReturnedEmptyState />
  }

  return (
    <ul className="list-none m-0 p-0">
      {returned.map(h => (
        <li key={h.historyId} className="border-b border-border first:border-t first:border-border">
          <BookItem
            book={h}
            prependMeta={
              <p className="m-0 mb-1 text-xs leading-[17px]">
                貸出日：{formatLoanDate(h.checkoutDate)}
              </p>
            }
          />
        </li>
      ))}
    </ul>
  )
}

export function HistoryList({
  activeTab,
  borrowing,
  returned,
  onReturn,
}: HistoryListProps) {
  if (activeTab === 'borrowing') {
    return <BorrowingList borrowing={borrowing} onReturn={onReturn} />
  }

  return <ReturnedList returned={returned} />
}
