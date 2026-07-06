export const LOCATIONS = ['daikanyama', 'okinawa'] as const
export type Location = (typeof LOCATIONS)[number]

export function isLocation(value: string): value is Location {
  return (LOCATIONS as readonly string[]).includes(value)
}

export type BookRow = {
  id: number
  isbn: string
  location: string
  title: string
  author: string | null
  publisher: string | null
  description: string | null
  published_date: string | null
  page_count: number | null
  cover_src: string | null
  total: number
  available_count: number
  created_at: string
  updated_at: string | null
}

export type HistoryRow = {
  id: number
  book_id: number | null
  isbn: string
  location: string
  borrower_email: string
  borrower_name: string | null
  checkout_date: string
  return_date: string | null
  is_done: number
}

export type BookJson = {
  isbn: string
  title: string
  author?: string
  publisher?: string
  publishedDate?: string
  cover: { src?: string }
  description?: string
  availableCount: number
  total: number
}

export type HistoryJson = BookJson & {
  historyId: string
  checkoutDate: string
  returnDate?: string
  isDone: boolean
  borrowerEmail: string
  borrowerName?: string
}

export function bookFromRow(row: BookRow): BookJson {
  return {
    isbn: row.isbn,
    title: row.title,
    author: row.author ?? undefined,
    publisher: row.publisher ?? undefined,
    publishedDate: row.published_date ?? undefined,
    cover: { src: row.cover_src ?? undefined },
    description: row.description ?? undefined,
    availableCount: row.available_count,
    total: row.total,
  }
}

/** history と book の LEFT JOIN 行から API 形へ変換。book 側が無ければフォールバック値を返す */
export function historyFromRow(history: HistoryRow, book: BookRow | null): HistoryJson {
  const fromBook = book ? bookFromRow(book) : null
  const borrowerEmail = history.borrower_email?.trim() ?? ''
  const borrowerNameRaw = history.borrower_name?.trim()
  const borrowerName = borrowerNameRaw ? borrowerNameRaw : undefined

  const base = fromBook ?? {
    isbn: history.isbn,
    title: '',
    author: undefined,
    publisher: undefined,
    publishedDate: undefined,
    cover: {},
    description: undefined,
    availableCount: 0,
    total: 0,
  }

  return {
    historyId: String(history.id),
    ...base,
    checkoutDate: history.checkout_date,
    returnDate: history.return_date ?? undefined,
    isDone: !!history.is_done,
    borrowerEmail,
    ...(borrowerName ? { borrowerName } : {}),
  }
}

/** LIKE のワイルドカード文字をエスケープして安全な部分一致にする */
export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (ch) => `\\${ch}`)
}

export async function findBooks(db: D1Database, location: string, q: string): Promise<BookRow[]> {
  if (q) {
    const pattern = `%${escapeLikePattern(q)}%`
    const { results } = await db
      .prepare(
        `SELECT * FROM books WHERE location = ?1 AND (title LIKE ?2 ESCAPE '\\' OR author LIKE ?2 ESCAPE '\\') LIMIT 100`,
      )
      .bind(location, pattern)
      .all<BookRow>()
    return results
  }

  const { results } = await db
    .prepare(`SELECT * FROM books WHERE location = ?1 LIMIT 100`)
    .bind(location)
    .all<BookRow>()
  return results
}

export async function findBookByIsbn(
  db: D1Database,
  isbn: string,
  location: string,
): Promise<BookRow | null> {
  const row = await db
    .prepare(`SELECT * FROM books WHERE isbn = ?1 AND location = ?2`)
    .bind(isbn, location)
    .first<BookRow>()
  return row ?? null
}

export async function insertBook(
  db: D1Database,
  book: {
    isbn: string
    title: string
    author?: string
    publisher?: string
    description?: string
    coverSrc?: string
    location: string
  },
): Promise<boolean> {
  const res = await db
    .prepare(
      `INSERT INTO books (isbn, location, title, author, publisher, description, cover_src, total, available_count)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 1, 1)
       ON CONFLICT (isbn, location) DO NOTHING`,
    )
    .bind(
      book.isbn,
      book.location,
      book.title,
      book.author ?? null,
      book.publisher ?? null,
      book.description ?? null,
      book.coverSrc ?? null,
    )
    .run()
  return (res.meta.changes ?? 0) > 0
}

export async function updateBookCount(
  db: D1Database,
  isbn: string,
  location: string,
  current: { availableCount: number; total: number },
  next: { availableCount: number; total: number },
): Promise<boolean> {
  const res = await db
    .prepare(
      `UPDATE books SET available_count = ?1, total = ?2, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
       WHERE isbn = ?3 AND location = ?4 AND available_count = ?5 AND total = ?6`,
    )
    .bind(next.availableCount, next.total, isbn, location, current.availableCount, current.total)
    .run()
  return (res.meta.changes ?? 0) > 0
}

export async function updateBookMetadata(
  db: D1Database,
  isbn: string,
  location: string,
  patch: {
    title?: string
    author?: string
    publisher?: string
    description?: string
    published_date?: string
    cover_src?: string | null
  },
): Promise<void> {
  const fields: string[] = []
  const values: unknown[] = []
  for (const [key, value] of Object.entries(patch)) {
    fields.push(`${key} = ?${fields.length + 1}`)
    values.push(value)
  }
  if (fields.length === 0) return

  fields.push(`updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')`)

  await db
    .prepare(
      `UPDATE books SET ${fields.join(', ')} WHERE isbn = ?${values.length + 1} AND location = ?${values.length + 2}`,
    )
    .bind(...values, isbn, location)
    .run()
}

export async function findHistories(
  db: D1Database,
  borrowerEmail: string,
  location: string,
  isDone?: string,
): Promise<Array<{ history: HistoryRow; book: BookRow | null }>> {
  const conditions = ['h.borrower_email = ?1', 'h.location = ?2']
  const params: unknown[] = [borrowerEmail, location]
  if (isDone !== undefined) {
    conditions.push(`h.is_done = ?${params.length + 1}`)
    params.push(isDone === 'true' ? 1 : 0)
  }

  const { results } = await db
    .prepare(
      `SELECT h.*, b.id AS b_id, b.isbn AS b_isbn, b.location AS b_location, b.title AS b_title,
              b.author AS b_author, b.publisher AS b_publisher, b.description AS b_description,
              b.published_date AS b_published_date, b.page_count AS b_page_count, b.cover_src AS b_cover_src,
              b.total AS b_total, b.available_count AS b_available_count, b.created_at AS b_created_at,
              b.updated_at AS b_updated_at
       FROM histories h
       LEFT JOIN books b ON b.id = h.book_id
       WHERE ${conditions.join(' AND ')}
       LIMIT 100`,
    )
    .bind(...params)
    .all<Record<string, unknown>>()

  return results.map((row) => splitHistoryBookRow(row))
}

function splitHistoryBookRow(row: Record<string, unknown>): {
  history: HistoryRow
  book: BookRow | null
} {
  const history: HistoryRow = {
    id: row.id as number,
    book_id: row.book_id as number | null,
    isbn: row.isbn as string,
    location: row.location as string,
    borrower_email: row.borrower_email as string,
    borrower_name: row.borrower_name as string | null,
    checkout_date: row.checkout_date as string,
    return_date: row.return_date as string | null,
    is_done: row.is_done as number,
  }

  const book: BookRow | null =
    row.b_id == null
      ? null
      : {
          id: row.b_id as number,
          isbn: row.b_isbn as string,
          location: row.b_location as string,
          title: row.b_title as string,
          author: row.b_author as string | null,
          publisher: row.b_publisher as string | null,
          description: row.b_description as string | null,
          published_date: row.b_published_date as string | null,
          page_count: row.b_page_count as number | null,
          cover_src: row.b_cover_src as string | null,
          total: row.b_total as number,
          available_count: row.b_available_count as number,
          created_at: row.b_created_at as string,
          updated_at: row.b_updated_at as string | null,
        }

  return { history, book }
}

export async function findHistoryWithBookById(
  db: D1Database,
  id: string,
): Promise<{ history: HistoryRow; book: BookRow | null } | null> {
  const row = await db
    .prepare(
      `SELECT h.*, b.id AS b_id, b.isbn AS b_isbn, b.location AS b_location, b.title AS b_title,
              b.author AS b_author, b.publisher AS b_publisher, b.description AS b_description,
              b.published_date AS b_published_date, b.page_count AS b_page_count, b.cover_src AS b_cover_src,
              b.total AS b_total, b.available_count AS b_available_count, b.created_at AS b_created_at,
              b.updated_at AS b_updated_at
       FROM histories h
       LEFT JOIN books b ON b.id = h.book_id
       WHERE h.id = ?1`,
    )
    .bind(Number(id))
    .first<Record<string, unknown>>()
  if (!row) return null
  return splitHistoryBookRow(row)
}

export type CheckoutResult =
  | { status: 'ok'; historyId: number }
  | { status: 'no-stock' }
  | { status: 'not-found' }

/** 貸出をアトミックに実行する: 在庫を減らしつつ履歴を作る（在庫ゼロ・未登録は原子的に弾く） */
export async function checkoutBook(
  db: D1Database,
  isbn: string,
  location: string,
  borrowerEmail: string,
  borrowerName: string,
): Promise<CheckoutResult> {
  const [, insertRes] = await db.batch<Record<string, unknown>>([
    db
      .prepare(
        `UPDATE books SET available_count = available_count - 1 WHERE isbn = ?1 AND location = ?2 AND available_count > 0`,
      )
      .bind(isbn, location),
    db
      .prepare(
        `INSERT INTO histories (book_id, isbn, location, borrower_email, borrower_name)
         SELECT id, isbn, location, ?3, ?4 FROM books WHERE isbn = ?1 AND location = ?2 AND changes() = 1`,
      )
      .bind(isbn, location, borrowerEmail, borrowerName),
  ])

  if ((insertRes.meta.changes ?? 0) > 0) {
    return { status: 'ok', historyId: insertRes.meta.last_row_id as number }
  }

  const book = await findBookByIsbn(db, isbn, location)
  if (!book) return { status: 'not-found' }
  return { status: 'no-stock' }
}

export type ReturnResult = 'ok' | 'already-returned'

/** 返却をアトミックに実行する: 履歴を完了にしつつ在庫を戻す（既に返却済みなら弾く） */
export async function returnBook(db: D1Database, historyId: string): Promise<ReturnResult> {
  const nowIso = new Date().toISOString()
  const [updateHistoryRes] = await db.batch([
    db
      .prepare(`UPDATE histories SET is_done = 1, return_date = ?1 WHERE id = ?2 AND is_done = 0`)
      .bind(nowIso, Number(historyId)),
    db
      .prepare(
        `UPDATE books SET available_count = MIN(available_count + 1, total)
         WHERE id = (SELECT book_id FROM histories WHERE id = ?1) AND changes() = 1`,
      )
      .bind(Number(historyId)),
  ])

  if ((updateHistoryRes.meta.changes ?? 0) === 0) return 'already-returned'
  return 'ok'
}
