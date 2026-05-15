export type HistorySubTab = 'borrowing' | 'past'

export type DialogConfig = {
  message: string
  confirmLabel: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel?: () => void
  width?: number
}

export type ToastState = {
  message: string
  type: 'success' | 'error'
} | null
