import { LOCATION_MAP } from '../../../../_foundation/const'
import { Header } from '../../../ui/Header'
import { IconAccountFilled, IconArrowNext, IconArrowPrev } from '../../../ui/icon'

import type { Location } from '../../../../_foundation/const'
import type { CurrentUser } from '../../../app'

type SettingsMainViewProps = {
  currentLocation: Location
  isDarkTheme: boolean
  user: CurrentUser | null
  onBack: () => void
  onOpenLocation: () => void
  onOpenVolume: () => void
  onToggleTheme: () => void
  onLogout: () => void
}

export function SettingsMainView({
  currentLocation,
  isDarkTheme,
  user,
  onBack,
  onOpenLocation,
  onOpenVolume,
  onToggleTheme,
  onLogout,
}: SettingsMainViewProps) {
  return (
    <div className="min-h-full flex flex-col bg-background">
      <Header
        title="設定"
        leftAction={
          <button
            type="button"
            className="flex items-center justify-center w-[44px] h-[44px] bg-transparent border-0 cursor-pointer text-primary p-0"
            onClick={onBack}
            aria-label="戻る"
          >
            <IconArrowPrev size={22} />
          </button>
        }
      />
      <div className="flex flex-col bg-surface border-b border-border">
        {user !== null && (
          <div className="flex items-center gap-3 min-h-[68px] px-[22px] border-b border-border">
            {user.picture ? (
              <img
                src={user.picture}
                alt=""
                className="h-10 w-10 shrink-0 rounded-full object-cover"
              />
            ) : (
              <span className="shrink-0 text-primary" aria-hidden>
                <IconAccountFilled size={32} bg="var(--color-surface)" />
              </span>
            )}
            <span className="flex min-w-0 flex-col">
              <span className="text-base text-text truncate">{user.name ?? user.email}</span>
              {user.name && <span className="text-xs text-text-muted truncate">{user.email}</span>}
            </span>
          </div>
        )}
        <button
          type="button"
          className="flex items-center justify-between gap-4 min-h-[60px] px-[22px] bg-transparent border-0 border-b border-border cursor-pointer text-left"
          onClick={onOpenLocation}
        >
          <span className="text-base text-text">拠点</span>
          <span className="flex items-center gap-2 min-w-0">
            <span className="text-sm text-text-muted truncate">
              {LOCATION_MAP[currentLocation]}
            </span>
            <span className="shrink-0" aria-hidden>
              <IconArrowNext size={20} />
            </span>
          </span>
        </button>

        <button
          type="button"
          className="flex items-center justify-between gap-4 min-h-[60px] px-[22px] bg-transparent border-0 border-b border-border cursor-pointer text-left"
          onClick={onOpenVolume}
        >
          <span className="text-base text-text">音量</span>
          <span className="flex items-center gap-1 shrink-0">
            <span className="shrink-0" aria-hidden>
              <IconArrowNext size={20} />
            </span>
          </span>
        </button>

        <div className="flex items-center justify-between min-h-[60px] px-[22px]">
          <span className="text-base text-text">ダークモード</span>
          <button
            type="button"
            role="switch"
            aria-checked={isDarkTheme}
            className="flex h-[44px] min-w-[44px] shrink-0 cursor-pointer items-center justify-center border-0 bg-transparent p-0"
            onClick={onToggleTheme}
          >
            {/* DESIGN.md Settings: iOS style pill. */}
            <span
              className={`relative block h-[22px] w-[44px] rounded-full transition-colors duration-200 ${
                isDarkTheme ? 'bg-[#1C1F22]' : 'border border-border bg-white'
              }`}
            >
              <span
                className={`absolute top-1/2 transform -translate-y-1/2 left-[3px] block h-4 w-4 rounded-full transition-transform duration-200 ease-out ${
                  isDarkTheme ? 'translate-x-[22px] bg-white' : 'translate-x-0 bg-[#1C1F22]'
                }`}
              />
            </span>
            <span className="sr-only">ダークモードを切り替える</span>
          </button>
        </div>
      </div>

      {user !== null && (
        <button
          type="button"
          className="mt-4 flex items-center min-h-[60px] px-[22px] bg-surface border-0 border-y border-border cursor-pointer text-left text-sm text-error"
          onClick={onLogout}
        >
          ログアウト
        </button>
      )}
    </div>
  )
}
