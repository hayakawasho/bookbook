import { useId } from 'react'

type DialogProps = {
  message: string
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  onCancel: () => void
  /** DESIGN / mobile ConfirmDialog: default 265, wider confirms often 287 */
  width?: number
}

export function Dialog({
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  width = 265,
}: DialogProps) {
  const messageId = useId()

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-modal="true"
      role="alertdialog"
      aria-labelledby={messageId}
    >
      <div className="absolute inset-0 bg-black/[.48]" onClick={onCancel} aria-hidden="true" />
      <div
        className="relative max-w-[min(100%,calc(100vw-2rem))] overflow-hidden rounded-[16px] bg-surface shadow-[0_16px_40px_rgba(0,0,0,0.24)] p-0"
        style={{ width }}
      >
        <p
          id={messageId}
          className="m-0 whitespace-pre-line px-4 pb-5 pt-6 text-center text-base font-semibold leading-[22px] tracking-[0.05em] text-text"
        >
          {message}
        </p>
        <div className="h-px w-full bg-[rgba(223,223,223,0.6)]" />
        <div className="flex min-h-11">
          <button
            type="button"
            className="flex min-h-11 flex-1 cursor-pointer items-center justify-center border-0 bg-transparent px-2 py-[14px] text-base leading-[22px] tracking-[0.05em] text-[#1986e0]"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <div className="w-px shrink-0 self-stretch bg-[rgba(223,223,223,0.6)]" aria-hidden="true" />
          <button
            type="button"
            className="flex min-h-11 flex-1 cursor-pointer items-center justify-center border-0 bg-transparent px-2 py-[14px] text-base font-semibold leading-[22px] tracking-[0.05em] text-[#1986e0]"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
