/** 数値を min〜max に収める */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** wire 上の ISO 日付文字列を Date に変換する。空・undefined は undefined */
export function parseDateOrUndefined(value?: string): Date | undefined {
  if (!value) {
    return undefined;
  }

  return new Date(value);
}
