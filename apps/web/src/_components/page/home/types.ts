import type { BookMetadata } from '../../../_book/model'
import type { ExternalBookInfo } from '../../../_repositories/books/interface'

export type SheetMode =
  | { kind: 'existing'; book: BookMetadata }
  | { kind: 'external'; book: ExternalBookInfo }

export type DialogConfig = {
  title: string
  message: string
  confirmLabel: string
  onConfirm: () => void
}

export type ToastState = {
  message: string
  type: 'success' | 'error'
} | null
