import { iconSizePx } from './types'

import type { FC } from 'react'
import type { IconProps } from './types'

export const IconPhotoCamera: FC<IconProps> = ({
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
      data-icon="photo-camera"
      {...rest}
    >
      <path
        d="M9 2 7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9Zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5Zm0-8.2A3.2 3.2 0 1 0 12 15.2 3.2 3.2 0 0 0 12 8.8Z"
        fill={color}
      />
    </svg>
  )
}
