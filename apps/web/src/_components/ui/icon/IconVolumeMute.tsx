import type { FC } from 'react'

import type { IconProps } from './types'
import { iconSizePx } from './types'

export const IconVolumeMute: FC<IconProps> = ({
  size = 24,
  color = 'currentColor',
  className,
  ...rest
}) => {
  const s = iconSizePx(size)
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" className={className} aria-hidden {...rest}>
      <path d="M7.219 9v6h4.125l5.156 5v-16l-5.156 5h-4.125z" fill={color} />
    </svg>
  )
}
