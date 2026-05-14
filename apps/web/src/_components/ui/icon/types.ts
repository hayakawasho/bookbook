import type { SVGAttributes } from 'react'

/** Web 版アイコン共通 — RN の native-base SVG とは別実装 */
export type IconProps = Omit<SVGAttributes<SVGSVGElement>, 'width' | 'height'> & {
  size?: number | string
  color?: string
}

export function iconSizePx(size?: number | string): number {
  if (typeof size === 'number' && Number.isFinite(size)) return size
  if (typeof size === 'string') {
    const n = parseFloat(size.replace('px', ''))
    return Number.isFinite(n) ? n : 24
  }
  return 24
}
