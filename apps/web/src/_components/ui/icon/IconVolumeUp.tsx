import type { FC } from 'react'

import type { IconProps } from './types'
import { iconSizePx } from './types'

export const IconVolumeUp: FC<IconProps> = ({
  size = 24,
  color = 'currentColor',
  className,
  ...rest
}) => {
  const s = iconSizePx(size)
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" className={className} aria-hidden {...rest}>
      <path
        d="M2.344 9v6h4.125l5.156 5v-16l-5.156 5h-4.125zM16.266 12c0-1.77-1.052-3.29-2.578-4.030v8.050c1.526-0.73 2.578-2.25 2.578-4.020zM13.688 3.23v2.060c2.98 0.86 5.156 3.54 5.156 6.71s-2.176 5.85-5.156 6.71v2.060c4.135-0.91 7.219-4.49 7.219-8.77s-3.083-7.86-7.219-8.77z"
        fill={color}
      />
    </svg>
  )
}
