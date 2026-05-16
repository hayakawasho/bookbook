/** 数値を min〜max に収める */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
