import type { FC } from 'react'

import type { IconProps } from './types'
import { iconSizePx } from './types'

/** inactive: アウトライン風ホーム */
export const IconHome: FC<IconProps> = ({
  size = 24,
  color = 'currentColor',
  className,
  ...rest
}) => {
  const s = iconSizePx(size)
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" className={className} aria-hidden {...rest}>
      <path
        d="M10.075 13.8v6.7h-5.575v-11.25l7.5-5.625 7.5 5.625v11.25h-5.575v-6.7h-3.85zM8.575 19v-6.7h6.85v6.7h2.575v-9l-6-4.5-6 4.5v9h2.575z"
        fill={color}
      />
    </svg>
  )
}
