import { normalizeIsbnBarcode } from '../../../../_foundation/utils'

import { createContinuousDetectionGate } from './continuousDetectionGate'

type BarcodeScanSessionOptions = {
  rearmGapMs: number
  requiredMatches: number
  failureAfterMs: number
}

type BarcodeScanSessionResult =
  | { kind: 'detecting' }
  | { kind: 'confirmed'; isbn: string }
  | { kind: 'failed' }

export function createBarcodeScanSession({
  rearmGapMs,
  requiredMatches,
  failureAfterMs,
}: BarcodeScanSessionOptions) {
  const detectionGate = createContinuousDetectionGate(rearmGapMs, requiredMatches)
  let attemptStartedAt: number | null = null
  let lastObservedAt: number | null = null
  let failureReported = false

  return {
    observe(raw: string, now: number): BarcodeScanSessionResult {
      if (lastObservedAt !== null && now - lastObservedAt >= rearmGapMs) {
        detectionGate.reset()
        attemptStartedAt = null
        failureReported = false
      }

      lastObservedAt = now
      attemptStartedAt ??= now

      const isbn = normalizeIsbnBarcode(raw)
      if (isbn && detectionGate.shouldHandle(isbn, now)) {
        attemptStartedAt = null
        failureReported = false
        return { kind: 'confirmed', isbn }
      }

      if (!failureReported && now - attemptStartedAt >= failureAfterMs) {
        failureReported = true
        return { kind: 'failed' }
      }

      return { kind: 'detecting' }
    },
    reset(): void {
      detectionGate.reset()
      attemptStartedAt = null
      lastObservedAt = null
      failureReported = false
    },
  }
}
