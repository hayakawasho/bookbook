import { useEffect } from 'react'

type ToastProps = {
  message: string
  type: 'success' | 'error'
  onDismiss: () => void
}

export function Toast({ message, type, onDismiss }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 2000)
    return () => clearTimeout(timer)
  }, [onDismiss])

  const isError = type === 'error'

  return (
    <div
      className={`fixed top-5 left-1/2 -translate-x-1/2 z-[60] px-6 py-3 text-sm font-semibold whitespace-nowrap text-[#1C1F22] ${isError ? 'bg-error' : 'bg-accent'}`}
      role="status"
      aria-live="polite"
    >
      {message}
    </div>
  )
}
