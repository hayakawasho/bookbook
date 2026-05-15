import { SvgBookbook } from './SvgBookbook'
import { SvgGoogle } from './SvgGoogle'

type LoginScreenProps = {
  onLogin: () => void
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  return (
    <main className="min-h-dvh bg-background px-[22px] text-text">
      <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col">
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-8 pb-10 pt-8">
          <div className="w-[min(292px,min(74vw,calc(100vw-44px)))] max-w-full shrink-0">
            <SvgBookbook />
          </div>
          <h1 className="whitespace-pre-line text-center text-[30px] font-bold leading-[38px] tracking-normal">
            {'本を身近に。\n広がる交流。'}
          </h1>
        </div>

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
      </div>
    </main>
  )
}
