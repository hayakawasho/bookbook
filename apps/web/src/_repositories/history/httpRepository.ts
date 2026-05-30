import { History } from '../../_models/history'
import type { Location } from '../../_foundation/const'
import type { HistoryQuery, HistoryRepository } from './interface'
import { toHistoryInput, type HistoryWire } from './mappers'

export class HttpHistoryRepository implements HistoryRepository {
  constructor(private readonly baseUrl: string) {}

  async findMany(query: HistoryQuery, location: Location): Promise<History[]> {
    const params = new URLSearchParams({ location })

    if (query.isDone !== undefined) {
      params.set('isDone', String(query.isDone))
    }

    const res = await fetch(`${this.baseUrl}/history?${params}`, { credentials: 'include' })

    if (!res.ok) {
      throw new Error(`GET /history failed: ${res.status}`)
    }

    const raw = (await res.json()) as HistoryWire[]
    return raw.map(dto => History.create(toHistoryInput(dto)))
  }

  async createCheckout(isbn: string, location: Location): Promise<History> {
    const res = await fetch(`${this.baseUrl}/history`, {
      credentials: 'include',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isbn, location }),
    })

    if (!res.ok) {
      throw new Error(`POST /history failed: ${res.status}`)
    }

    const raw = (await res.json()) as HistoryWire
    return History.create(toHistoryInput(raw))
  }

  async markReturned(historyId: string, isbn: string, location: Location): Promise<void> {
    const res = await fetch(`${this.baseUrl}/history/${historyId}`, {
      credentials: 'include',
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isbn, location }),
    })

    if (!res.ok) {
      throw new Error(`PATCH /history/${historyId} failed: ${res.status}`)
    }
  }
}
