import { useCallback, useState } from 'react'

import type { ToastState } from '../types'

export function useHomeToast() {
  const [toast, setToast] = useState<ToastState>(null)

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type })
  }, [])

  return { toast, setToast, showToast }
}
