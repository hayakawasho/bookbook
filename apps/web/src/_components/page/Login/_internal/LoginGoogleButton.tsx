import { SvgGoogle } from './SvgGoogle'

type LoginGoogleButtonProps = {
  onLogin: () => void
}

export function LoginGoogleButton({ onLogin }: LoginGoogleButtonProps) {
  return (
    <div className="w-full shrink-0 pb-16">
      <button
        type="button"
        onClick={onLogin}
        className="flex h-14 w-full items-center justify-center gap-4 rounded-none border border-border bg-surface px-5 text-base font-bold text-text"
      >
        <SvgGoogle />
        <span>Googleでログイン</span>
      </button>
      <p className="mt-4 text-center text-xs leading-[17px] text-text-muted">
        パノラマのGoogleアカウントでログインしてください。
      </p>
    </div>
  )
}
