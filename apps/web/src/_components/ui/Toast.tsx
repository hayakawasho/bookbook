import { useEffect, useState } from 'react'

const ENTER_MS = 240
const VISIBLE_MS = 2000
const EXIT_MS = 220

type ToastProps = {
  message: string
  type: 'success' | 'error'
  onDismiss: () => void
}

export function Toast({ message, type, onDismiss }: ToastProps) {
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const enterMs = reducedMotion ? 1 : ENTER_MS

    const startExitTimer = window.setTimeout(() => {
      setExiting(true)
    }, enterMs + VISIBLE_MS)

    return () => {
      window.clearTimeout(startExitTimer)
    }
  }, [])

  useEffect(() => {
    if (!exiting) {
      return
    }
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const exitMs = reducedMotion ? 1 : EXIT_MS
    const doneTimer = window.setTimeout(onDismiss, exitMs)
    return () => {
      window.clearTimeout(doneTimer)
    }
  }, [exiting, onDismiss])

  const isError = type === 'error'

  return (
    <div
      className={`toast-motion fixed top-5 left-1/2 z-60 px-6 py-3 text-sm font-semibold whitespace-nowrap text-[#1C1F22] ${isError ? 'bg-error' : 'bg-accent'} ${exiting ? 'animate-toast-exit' : 'animate-toast-enter'}`}
      role="status"
      aria-live="polite"
    >
      {message}
    </div>
  )
}
