import { useState } from 'react'
import { useAppContext } from '../../../_states/app-context'
import { Header } from '../../ui/header'
import type { Location } from '../../../_foundation/const'
import { LOCATION_MAP } from '../../../_foundation/const'
import { VolumeSettingsScreen } from './volume-settings-screen'
import { IconArrowNext, IconArrowPrev } from '../../ui/icon'

type SettingsScreenProps = {
  onBack: () => void
}

type SettingsView = 'main' | 'location' | 'volume'

export function SettingsScreen({ onBack }: SettingsScreenProps) {
  const { state, dispatch } = useAppContext()
  const [view, setView] = useState<SettingsView>('main')

  const handleRootBack = () => {
    if (view === 'main') {
      onBack()
      return
    }
    setView('main')
  }

  const isDarkTheme = state.themeMode === 'dark'

  if (view === 'location') {
    return (
      <div className="min-h-full flex flex-col bg-background">
        <Header
          title="拠点"
          leftAction={
            <button
              type="button"
              className="flex items-center justify-center w-[44px] h-[44px] bg-transparent border-0 cursor-pointer text-primary p-0"
              onClick={() => setView('main')}
              aria-label="戻る"
            >
              <IconArrowPrev size={22} />
            </button>
          }
        />
        <ul className="list-none m-0 p-0 bg-surface border-b border-border">
          {(Object.entries(LOCATION_MAP) as [Location, string][]).map(([loc, label]) => (
            <li key={loc} className="border-b border-border last:border-b-0">
              <button
                type="button"
                className="w-full flex items-center justify-between min-h-[56px] px-[22px] bg-transparent border-0 cursor-pointer text-left text-base text-text"
                onClick={() => {
                  dispatch({ type: 'SET_LOCATION', payload: loc })
                  setView('main')
                }}
              >
                <span>{label}</span>
                {state.location === loc && (
                  <span className="text-sm font-semibold text-success" aria-hidden="true">
                    ✓
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  if (view === 'volume') {
    return <VolumeSettingsScreen onBack={() => setView('main')} />
  }

  return (
    <div className="min-h-full flex flex-col bg-background">
      <Header
        title="設定"
        leftAction={
          <button
            type="button"
            className="flex items-center justify-center w-[44px] h-[44px] bg-transparent border-0 cursor-pointer text-primary p-0"
            onClick={handleRootBack}
            aria-label="戻る"
          >
            <IconArrowPrev size={22} />
          </button>
        }
      />
      <div className="flex flex-col bg-surface border-b border-border">
        <button
          type="button"
          className="flex items-center justify-between gap-4 min-h-[60px] px-[22px] bg-transparent border-0 border-b border-border cursor-pointer text-left"
          onClick={() => setView('location')}
        >
          <span className="text-base text-text">拠点</span>
          <span className="flex items-center gap-2 min-w-0">
            <span className="text-sm text-text-muted truncate">{LOCATION_MAP[state.location]}</span>
            <span className="shrink-0" aria-hidden>
              <IconArrowNext size={20} />
            </span>
          </span>
        </button>

        <button
          type="button"
          className="flex items-center justify-between gap-4 min-h-[60px] px-[22px] bg-transparent border-0 border-b border-border cursor-pointer text-left"
          onClick={() => setView('volume')}
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
            onClick={() =>
              dispatch({
                type: 'SET_THEME_MODE',
                payload: isDarkTheme ? 'light' : 'dark',
              })
            }
          >
            {/* DESIGN.md Settings — iOS 風 pill: オンは黒トラック＋白ノブ。トラックはコンパクト */}
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
    </div>
  )
}
