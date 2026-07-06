export type StockCounts = {
  availableCount: number
  total: number
}

export type CurrentStock = {
  available_count: number
  total: number
}

export function validateStockTransition(
  current: CurrentStock,
  next: StockCounts,
): { ok: true } | { ok: false; reason: string } {
  const { available_count, total: currentTotal } = current
  const { availableCount, total } = next

  if (availableCount < 0 || total < 1 || availableCount > total) {
    return { ok: false, reason: 'invalid stock counts' }
  }

  const dAvail = availableCount - available_count
  const dTotal = total - currentTotal

  if (dTotal === 1 && dAvail === 1) {
    return { ok: true }
  }

  if (dTotal === 0 && dAvail === -1) {
    if (available_count <= 0) {
      return { ok: false, reason: 'not available' }
    }

    return { ok: true }
  }

  if (dTotal === 0 && dAvail === 1) {
    if (available_count >= currentTotal) {
      return { ok: false, reason: 'already fully returned' }
    }

    return { ok: true }
  }

  return { ok: false, reason: 'invalid stock transition' }
}
