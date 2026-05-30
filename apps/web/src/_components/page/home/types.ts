import type { Book } from '../../../_models/book'
import type { ExternalBookInfo } from '../../../_repositories/books/interface'

export type SheetMode =
  | { kind: 'existing'; book: Book }
  | { kind: 'external'; book: ExternalBookInfo }

export type DialogConfig = {
  message: string
  confirmLabel: string
  /** Mobile ConfirmDialog: e.g. いいえ / キャンセル */
  cancelLabel?: string
  onConfirm: () => void
  /** When set, used for backdrop/cancel instead of only clearing dialog */
  onCancel?: () => void
  /** Matches mobile ConfirmDialog widths: 265 default, 287 for sheet confirmations */
  width?: number
}

export type ToastState = {
  message: string
  type: 'success' | 'error'
} | null
