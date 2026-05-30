import type { ReactNode } from 'react'

type ListPlaceholderVariant = 'loading' | 'error' | 'empty'

type ListPlaceholderProps = {
  variant: ListPlaceholderVariant
  message: string
  detail?: ReactNode
  messageClassName?: string
}

function defaultMessageClassName(variant: ListPlaceholderVariant): string {
  if (variant === 'error') {
    return 'text-sm text-center text-error'
  }

  if (variant === 'loading') {
    return 'text-sm text-center text-text-muted'
  }

  return 'text-sm text-center'
}

export function ListPlaceholder({
  variant,
  message,
  detail,
  messageClassName,
}: ListPlaceholderProps) {
  return (
    <div className="h-full grid items-center gap-2 text-sm text-center">
      <p className={messageClassName ?? defaultMessageClassName(variant)}>{message}</p>
      {detail}
    </div>
  )
}
