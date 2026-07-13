import type { ToastAction } from '../../ui/Toast'

export type HistorySubTab = 'borrowing' | 'past'

export type ToastState = {
  message: string
  type: 'success' | 'error'
  action?: ToastAction
} | null
