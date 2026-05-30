import { LoginBranding } from './_internal/LoginBranding'
import { LoginGoogleButton } from './_internal/LoginGoogleButton'

type LoginScreenProps = {
  onLogin: () => void
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  return (
    <main className="min-h-dvh bg-background px-[22px] text-text">
      <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col">
        <LoginBranding />
        <LoginGoogleButton onLogin={onLogin} />
      </div>
    </main>
  )
}
