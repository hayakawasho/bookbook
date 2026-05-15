import type { HistoryMetadata } from '../../_book/model'
import type { Location } from '../../_foundation/const'
import type { HistoryQuery, HistoryRepository } from './interface'

type RawHistory = Omit<
  HistoryMetadata,
  'checkoutDate' | 'returnDate' | 'publishedDate' | 'borrowerEmail' | 'borrowerName'
> & {
  checkoutDate: string
  returnDate?: string
  publishedDate?: string
  borrowerEmail?: string
  borrowerName?: string
}

function parseHistory(raw: RawHistory): HistoryMetadata {
  return {
    ...raw,
    checkoutDate: new Date(raw.checkoutDate),
    returnDate: raw.returnDate ? new Date(raw.returnDate) : undefined,
    publishedDate: raw.publishedDate ? new Date(raw.publishedDate) : undefined,
    borrowerEmail: raw.borrowerEmail ?? '',
    borrowerName: raw.borrowerName,
  }
}

export class HttpHistoryRepository implements HistoryRepository {
  constructor(private readonly baseUrl: string) {}

  async findMany(query: HistoryQuery, location: Location): Promise<HistoryMetadata[]> {
    const params = new URLSearchParams({ location })
    if (query.isDone !== undefined) params.set('isDone', String(query.isDone))
    const res = await fetch(`${this.baseUrl}/history?${params}`, { credentials: 'include' })
    if (!res.ok) throw new Error(`GET /history failed: ${res.status}`)
    const raw = (await res.json()) as RawHistory[]
    return raw.map(parseHistory)
  }

  async createCheckout(isbn: string, location: Location): Promise<HistoryMetadata> {
    const res = await fetch(`${this.baseUrl}/history`, {
      credentials: 'include',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isbn, location }),
    })
    if (!res.ok) throw new Error(`POST /history failed: ${res.status}`)
    const raw = (await res.json()) as RawHistory
    return parseHistory(raw)
  }

  async markReturned(historyId: string, isbn: string, location: Location): Promise<void> {
    const res = await fetch(`${this.baseUrl}/history/${historyId}`, {
      credentials: 'include',
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isbn, location }),
    })
    if (!res.ok) throw new Error(`PATCH /history/${historyId} failed: ${res.status}`)
  }
}
