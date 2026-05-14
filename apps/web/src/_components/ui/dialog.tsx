type DialogProps = {
  title: string
  message: string
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  onCancel: () => void
}

export function Dialog({
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: DialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" aria-modal="true" role="alertdialog">
      <div className="absolute inset-0 bg-black/[.48]" onClick={onCancel} aria-hidden="true" />
      <div className="relative w-[280px] bg-surface shadow-[0_16px_40px_rgba(0,0,0,0.24)] p-6">
        <h2 className="m-0 mb-3 text-base font-semibold text-text">{title}</h2>
        <p className="m-0 mb-6 text-sm leading-[22px] text-text">{message}</p>
        <div className="flex gap-3">
          <button
            className="flex-1 min-h-[44px] border-0 rounded-none text-sm font-semibold cursor-pointer bg-background text-text"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            className="flex-1 min-h-[44px] border-0 rounded-none text-sm font-semibold cursor-pointer bg-primary text-primary-contrast"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
