export type HistorySubTab = 'borrowing' | 'past'

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
