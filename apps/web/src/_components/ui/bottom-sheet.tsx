import type { ReactNode } from 'react'

type BottomSheetProps = {
  open: boolean
  onClose: () => void
  children: ReactNode
}

export function BottomSheet({ open, onClose, children }: BottomSheetProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-30 flex items-end" aria-modal="true" role="dialog">
      <div
        className="absolute inset-0 bg-black/[.48]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="relative w-full max-w-[430px] mx-auto bg-background rounded-t-[20px] min-h-[404px] h-[calc(100dvh-100dvw-20px)] overflow-y-auto"
      >
        <div className="w-10 h-1 bg-border rounded-full mx-auto mt-3 mb-2" />
        {children}
      </div>
    </div>
  )
}
