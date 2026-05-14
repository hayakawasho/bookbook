import type { FC } from 'react'
import type { IconProps } from './types'
import { iconSizePx } from './types'

/** active: 塗りつぶしホーム */
export const IconHomeFilled: FC<IconProps> = ({
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
        d="M4.5 20.5v-11.25l7.5-5.625 7.5 5.625v11.25h-5.575v-6.7h-3.85v6.7h-5.575z"
        fill={color}
      />
    </svg>
  )
}
