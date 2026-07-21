/**
 * カメラは同一バーコードがフレームに映っている間、検知を繰り返し発火する。
 * 「映り続けている間は 1 回だけ扱い、フレームから外れて再度かざしたら新規スキャン」にするためのゲート。
 */
export function createContinuousDetectionGate(rearmGapMs: number, requiredMatches = 1) {
  let lastRaw: string | null = null
  let lastSeenAt = 0
  let matchCount = 0
  // 扱い済みの値は別値が挟まっても保持し、値ごとの検知断が rearmGapMs 続いたときだけ再アームする
  const handledSeenAtByRaw = new Map<string, number>()

  return {
    /** 呼ぶたびに目撃時刻を更新する。新規スキャンとして扱うべきときだけ true */
    shouldHandle(raw: string, now: number): boolean {
      const isContinuousSighting = raw === lastRaw && now - lastSeenAt < rearmGapMs
      matchCount = isContinuousSighting ? matchCount + 1 : 1
      lastRaw = raw
      lastSeenAt = now

      for (const [handledRaw, handledSeenAt] of handledSeenAtByRaw) {
        if (now - handledSeenAt >= rearmGapMs) {
          handledSeenAtByRaw.delete(handledRaw)
        }
      }

      if (handledSeenAtByRaw.has(raw)) {
        handledSeenAtByRaw.set(raw, now)
        return false
      }

      if (matchCount < requiredMatches) {
        return false
      }

      handledSeenAtByRaw.set(raw, now)
      return true
    },

    /** 明示的なスキャン再開操作（カメラの再オン等）で抑止状態を破棄する */
    reset(): void {
      lastRaw = null
      lastSeenAt = 0
      matchCount = 0
      handledSeenAtByRaw.clear()
    },
  }
}

export type ContinuousDetectionGate = ReturnType<typeof createContinuousDetectionGate>
