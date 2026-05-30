import type { FC } from 'react'

import type { IconProps } from './types'
import { iconSizePx } from './types'

export const IconArrowNext: FC<IconProps> = ({
  size = 24,
  color = 'currentColor',
  className,
  ...rest
}) => {
  const s = iconSizePx(size)
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" className={className} aria-hidden {...rest}>
      <path
        d="M9.248 3.952l-1.697 1.697 6.351 6.352-6.351 6.351 1.697 1.697 8.049-8.049-8.049-8.049z"
        fill={color}
      />
    </svg>
  )
}
