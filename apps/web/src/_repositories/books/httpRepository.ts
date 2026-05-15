import type { BookMetadata } from '../../_book/model'
import type { Location } from '../../_foundation/const'
import type {
  BookCountOperation,
  BookRepository,
  ExternalBookInfo,
  FindByIsbnResult,
} from './interface'

type RawBook = Omit<BookMetadata, 'publishedDate'> & { publishedDate?: string }

function parseBook(raw: RawBook): BookMetadata {
  return {
    ...raw,
    publishedDate: raw.publishedDate ? new Date(raw.publishedDate) : undefined,
  }
}

export class HttpBookRepository implements BookRepository {
  constructor(private readonly baseUrl: string) {}

  async findByIsbn(isbn: string, location: Location): Promise<FindByIsbnResult> {
    const params = new URLSearchParams({ location })
    const res = await fetch(`${this.baseUrl}/books/${isbn}?${params}`, {
      credentials: 'include',
    })
    if (res.status === 404) return { status: 'notfound' }
    if (!res.ok) throw new Error(`GET /books/${isbn} failed: ${res.status}`)
    return (await res.json()) as FindByIsbnResult
  }

  async findMany(query: string, location: Location): Promise<BookMetadata[]> {
    const params = new URLSearchParams({ q: query, location })
    const res = await fetch(`${this.baseUrl}/books?${params}`, { credentials: 'include' })
    if (!res.ok) throw new Error(`GET /books failed: ${res.status}`)
    const raw = (await res.json()) as RawBook[]
    return raw.map(parseBook)
  }

  async create(book: ExternalBookInfo, location: Location): Promise<void> {
    const res = await fetch(`${this.baseUrl}/books`, {
      credentials: 'include',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...book, location }),
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      throw new Error(`POST /books failed: ${res.status}${detail ? ` ${detail}` : ''}`)
    }
  }

  async updateCount(
    isbn: string,
    operation: BookCountOperation,
    location: Location,
  ): Promise<void> {
    const res = await fetch(`${this.baseUrl}/books/${isbn}/count`, {
      credentials: 'include',
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operation, location }),
    })
    if (!res.ok) throw new Error(`PATCH /books/${isbn}/count failed: ${res.status}`)
  }
}
