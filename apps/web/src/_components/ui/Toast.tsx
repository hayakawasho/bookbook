import { useEffect } from 'react'

const VISIBLE_MS = 2000

type ToastProps = {
  message: string
  type: 'success' | 'error'
  onDismiss: () => void
}

export function Toast({ message, type, onDismiss }: ToastProps) {
  useEffect(() => {
    const doneTimer = window.setTimeout(onDismiss, VISIBLE_MS)
    return () => {
      window.clearTimeout(doneTimer)
    }
  }, [onDismiss])

  const isError = type === 'error'

  return (
    <div
      className={`fixed top-5 left-1/2 z-60 -translate-x-1/2 px-6 py-3 text-sm font-semibold whitespace-nowrap text-[#1C1F22] ${isError ? 'bg-error' : 'bg-accent'}`}
      role="status"
      aria-live="polite"
    >
      {message}
    </div>
  )
}
