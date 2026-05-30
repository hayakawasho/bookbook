import { BookItem } from '../../usecase/book/BookItem'

import type { ReactNode } from 'react'
import type { History } from '../../../_models/history'
import type { HistorySubTab } from './types'

type HistoryListProps = {
  borrowing: History[]
  returned: History[]
  activeTab: HistorySubTab
  onReturn: (history: History) => void
}

function formatLoanDate(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}.${m}.${d}`
}

function LoanDateMeta({ date }: { date: Date }) {
  return <p className="m-0 mb-1 text-xs leading-[17px]">貸出日：{formatLoanDate(date)}</p>
}

function HistoryRow({ history, action }: { history: History; action?: ReactNode }) {
  return (
    <li className="border-b border-border first:border-t first:border-border">
      <BookItem
        book={history}
        prependMeta={<LoanDateMeta date={history.checkoutDate} />}
        action={action}
      />
    </li>
  )
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

function BorrowingList({ borrowing, onReturn }: Pick<HistoryListProps, 'borrowing' | 'onReturn'>) {
  if (borrowing.length === 0) {
    return <BorrowingEmptyState />
  }

  return (
    <ul className="list-none m-0 p-0">
      {borrowing.map((history) => (
        <HistoryRow
          key={String(history.id)}
          history={history}
          action={
            <button
              type="button"
              className="w-full min-h-[36px] px-4 bg-primary text-primary-contrast border-0 text-xs font-semibold cursor-pointer"
              onClick={() => onReturn(history)}
            >
              返却
            </button>
          }
        />
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
      {returned.map((history) => (
        <HistoryRow key={String(history.id)} history={history} />
      ))}
    </ul>
  )
}

export function HistoryList({ activeTab, borrowing, returned, onReturn }: HistoryListProps) {
  if (activeTab === 'borrowing') {
    return <BorrowingList borrowing={borrowing} onReturn={onReturn} />
  }

  return <ReturnedList returned={returned} />
}
