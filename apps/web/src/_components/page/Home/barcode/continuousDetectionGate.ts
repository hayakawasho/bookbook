/**
 * カメラは同一バーコードがフレームに映っている間、検知を繰り返し発火する。
 * 「映り続けている間は 1 回だけ扱い、フレームから外れて再度かざしたら新規スキャン」にするためのゲート。
 */
export function createContinuousDetectionGate(rearmGapMs: number) {
  let lastRaw: string | null = null
  let lastSeenAt = 0

  return {
    /** 呼ぶたびに目撃時刻を更新する。新規スキャンとして扱うべきときだけ true */
    shouldHandle(raw: string, now: number): boolean {
      const isContinuousSighting = raw === lastRaw && now - lastSeenAt < rearmGapMs

      lastRaw = raw
      lastSeenAt = now

      return !isContinuousSighting
    },

    /** 明示的なスキャン再開操作（カメラの再オン等）で抑止状態を破棄する */
    reset(): void {
      lastRaw = null
      lastSeenAt = 0
    },
  }
}

export type ContinuousDetectionGate = ReturnType<typeof createContinuousDetectionGate>
