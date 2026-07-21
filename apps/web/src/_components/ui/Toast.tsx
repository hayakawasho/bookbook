import { useEffect } from 'react'

const VISIBLE_MS = 2000
// action 付きは押す猶予が要るため長めに表示する
const VISIBLE_WITH_ACTION_MS = 5000

export type ToastAction = {
  label: string
  onAction: () => void
}

type ToastProps = {
  message: string
  type: 'success' | 'error' | 'info'
  action?: ToastAction
  onDismiss: () => void
}

function getToastToneClassName(type: ToastProps['type']): string {
  switch (type) {
    case 'error':
      return 'font-semibold bg-error text-[#1C1F22]'
    case 'success':
      return 'font-semibold bg-accent text-[#1C1F22]'
    case 'info':
      return 'bg-info text-white'
  }
}

export function Toast({ message, type, action, onDismiss }: ToastProps) {
  useEffect(() => {
    const doneTimer = window.setTimeout(onDismiss, action ? VISIBLE_WITH_ACTION_MS : VISIBLE_MS)
    return () => {
      window.clearTimeout(doneTimer)
    }
  }, [onDismiss, action])

  const toneClassName = getToastToneClassName(type)

  return (
    <div
      className={`fixed top-5 left-1/2 z-60 -translate-x-1/2 w-11/12 justify-between flex items-center gap-4 px-4 py-3 text-sm ${toneClassName}`}
      role="status"
      aria-live="polite"
    >
      {message}
      {action && (
        <button
          type="button"
          className="bg-transparent border-0 p-0 text-sm font-semibold underline underline-offset-2 cursor-pointer text-inherit"
          onClick={action.onAction}
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
