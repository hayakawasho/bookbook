import { Book } from '../../_models/book'
import type { BookDto, ExternalBookDto } from '../../_models/book'
import type { Location } from '../../_foundation/const'
import type {
  BookCountOperation,
  BookRepository,
  ExternalBookInfo,
  FindByIsbnResult,
} from './interface'
import { toBookInput, toExternalBookInfo } from './mappers'

type FindByIsbnJson =
  | { status: 'registered'; book: BookDto }
  | { status: 'external'; book: ExternalBookDto }

export class HttpBookRepository implements BookRepository {
  constructor(private readonly baseUrl: string) {}

  async findByIsbn(isbn: string, location: Location): Promise<FindByIsbnResult> {
    const params = new URLSearchParams({ location })
    const res = await fetch(`${this.baseUrl}/books/${isbn}?${params}`, {
      credentials: 'include',
    })

    if (res.status === 404) {
      return { status: 'notfound' as const }
    }

    if (!res.ok) {
      throw new Error(`GET /books/${isbn} failed: ${res.status}`)
    }

    const json = (await res.json()) as FindByIsbnJson

    switch (json.status) {
      case 'registered':
        return { status: 'registered', book: Book.create(toBookInput(json.book)) }
      case 'external':
        return { status: 'external', book: toExternalBookInfo(json.book) }
      default:
        throw new Error(
          `GET /books/${isbn} returned unexpected status: ${(json as { status: string }).status}`,
        )
    }
  }

  async findMany(query: string, location: Location): Promise<Book[]> {
    const params = new URLSearchParams({ q: query, location })
    const res = await fetch(`${this.baseUrl}/books?${params}`, { credentials: 'include' })

    if (!res.ok) {
      throw new Error(`GET /books failed: ${res.status}`)
    }

    const raw = (await res.json()) as BookDto[]
    return raw.map(dto => Book.create(toBookInput(dto)))
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

    if (!res.ok) {
      throw new Error(`PATCH /books/${isbn}/count failed: ${res.status}`)
    }
  }
}
