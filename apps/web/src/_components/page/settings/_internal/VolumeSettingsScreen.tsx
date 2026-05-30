import { useAppContext } from '../../../../_states/AppContext'
import { Header } from '../../../ui/Header'
import { IconArrowPrev, IconVolumeMute, IconVolumeUp } from '../../../ui/icon'

type VolumeSettingsScreenProps = {
  onBack: () => void
}

/** DESIGN.md §4 Volume — Figma に近い薄グレーの本文領域 */
export function VolumeSettingsScreen({ onBack }: VolumeSettingsScreenProps) {
  const { state, dispatch } = useAppContext()

  return (
    <div className="min-h-full flex flex-col bg-background">
      <Header
        title="音量"
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
      <div className="flex flex-col px-[22px] py-8 gap-6 bg-background border-b border-border flex-1">
        <p className="m-0 text-sm font-semibold leading-[22px] text-text">効果音</p>
        <div className="flex items-center gap-3">
          <span className="___text-middle shrink-0 [&_svg]:block" aria-hidden>
            <IconVolumeMute size={22} />
          </span>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={state.volume}
            onChange={(e) => dispatch({ type: 'SET_VOLUME', payload: Number(e.target.value) })}
            className="flex-1 min-w-0 volume-range"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={state.volume}
            aria-label="音量を調整するにはスライダーを左右にスワイプしてください。"
          />
          <span className="__text-middle shrink-0 [&_svg]:block" aria-hidden>
            <IconVolumeUp size={24} />
          </span>
        </div>
        <p className="m-0 text-xs leading-[17px] text-text-muted max-w-[320px]">
          貸出完了時の音量を変更できます。
        </p>
      </div>
    </div>
  )
}
