import type { ReactNode } from 'react'

type HeaderProps = {
  title: string
  leftAction?: ReactNode
  rightAction?: ReactNode
}

export function Header({ title, leftAction, rightAction }: HeaderProps) {
  return (
    <header className="bg-surface border-b border-border shrink-0 z-10 pt-[env(safe-area-inset-top,0px)]">
      <div className="relative flex items-center justify-center min-h-[48px] px-2">
        <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center min-w-[44px] justify-start">
          {leftAction}
        </div>
        <span className="text-sm font-semibold text-text text-center max-w-[60%]">{title}</span>
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center min-w-[44px] justify-end">
          {rightAction}
        </div>
      </div>
    </header>
  )
}
