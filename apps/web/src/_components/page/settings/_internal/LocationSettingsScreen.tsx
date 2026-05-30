import { LOCATION_MAP } from '../../../../_foundation/const'
import { Header } from '../../../ui/Header'
import { IconArrowPrev } from '../../../ui/icon'

import type { Location } from '../../../../_foundation/const'

type LocationSettingsScreenProps = {
  currentLocation: Location
  onBack: () => void
  onSelectLocation: (location: Location) => void
}

export function LocationSettingsScreen({
  currentLocation,
  onBack,
  onSelectLocation,
}: LocationSettingsScreenProps) {
  return (
    <div className="min-h-full flex flex-col bg-background">
      <Header
        title="拠点"
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
      <ul className="list-none m-0 p-0 bg-surface border-b border-border">
        {(Object.entries(LOCATION_MAP) as [Location, string][]).map(([loc, label]) => (
          <li key={loc} className="border-b border-border last:border-b-0">
            <button
              type="button"
              className="w-full flex items-center justify-between min-h-[56px] px-[22px] bg-transparent border-0 cursor-pointer text-left text-base text-text"
              onClick={() => onSelectLocation(loc)}
            >
              <span>{label}</span>
              {currentLocation === loc && (
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
