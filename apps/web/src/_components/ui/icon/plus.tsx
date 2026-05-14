import type { FC } from 'react'
import type { IconProps } from './types'
import { iconSizePx } from './types'

export const IconPlus: FC<IconProps> = ({
  size = 24,
  color = 'currentColor',
  className,
  ...rest
}) => {
  const s = iconSizePx(size)
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      {...rest}
    >
      <path
        d="M10.5 10.5v-10.5h3v10.5h10.5v3h-10.5v10.5h-3v-10.5h-10.5v-3h10.5z"
        fill={color}
      />
    </svg>
  )
}
