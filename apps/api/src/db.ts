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
  deleted_at: string | null
}

export type HistoryRow = {
  id: number
  book_id: number
  borrower_email: string
  borrower_name: string | null
  checkout_date: string
  return_date: string | null
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

/** book の在庫を導出する SELECT 句。SELECT ... FROM books b の後段で使う */
const BOOK_SELECT = `b.*, b.total - (SELECT COUNT(*) FROM histories h WHERE h.book_id = b.id AND h.return_date IS NULL) AS available_count`

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

export function historyFromRow(history: HistoryRow, book: BookRow): HistoryJson {
  const borrowerEmail = history.borrower_email?.trim() ?? ''
  const borrowerNameRaw = history.borrower_name?.trim()
  const borrowerName = borrowerNameRaw ? borrowerNameRaw : undefined

  return {
    historyId: String(history.id),
    ...bookFromRow(book),
    checkoutDate: history.checkout_date,
    returnDate: history.return_date ?? undefined,
    isDone: history.return_date !== null,
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
        `SELECT ${BOOK_SELECT} FROM books b
         WHERE b.location = ?1 AND b.deleted_at IS NULL AND (b.title LIKE ?2 ESCAPE '\\' OR b.author LIKE ?2 ESCAPE '\\')
         ORDER BY b.created_at DESC, b.id DESC`,
      )
      .bind(location, pattern)
      .all<BookRow>()
    return results
  }

  const { results } = await db
    .prepare(
      `SELECT ${BOOK_SELECT} FROM books b WHERE b.location = ?1 AND b.deleted_at IS NULL
       ORDER BY b.created_at DESC, b.id DESC`,
    )
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
    .prepare(
      `SELECT ${BOOK_SELECT} FROM books b WHERE b.isbn = ?1 AND b.location = ?2 AND b.deleted_at IS NULL`,
    )
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
  // 論理削除済みの同一 isbn/location の復活は将来課題（現状は無視して新規登録を諦める）
  const res = await db
    .prepare(
      `INSERT INTO books (isbn, location, title, author, publisher, description, cover_src, total)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 1)
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

export async function addBookCopy(
  db: D1Database,
  isbn: string,
  location: string,
): Promise<BookRow | null> {
  const res = await db
    .prepare(
      `UPDATE books SET total = total + 1, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
       WHERE isbn = ?1 AND location = ?2 AND deleted_at IS NULL`,
    )
    .bind(isbn, location)
    .run()

  if ((res.meta.changes ?? 0) === 0) {
    return null
  }

  return findBookByIsbn(db, isbn, location)
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
  // 型に加えて実行時にも列名を固定し、SQL への列名混入を防ぐ
  const PATCHABLE_COLUMNS = [
    'title',
    'author',
    'publisher',
    'description',
    'published_date',
    'cover_src',
  ] as const

  const fields: string[] = []
  const values: unknown[] = []
  for (const key of PATCHABLE_COLUMNS) {
    if (!(key in patch)) {
      continue
    }

    fields.push(`${key} = ?${fields.length + 1}`)
    values.push(patch[key])
  }
  if (fields.length === 0) {
    return
  }

  fields.push(`updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')`)

  await db
    .prepare(
      `UPDATE books SET ${fields.join(', ')} WHERE isbn = ?${values.length + 1} AND location = ?${values.length + 2} AND deleted_at IS NULL`,
    )
    .bind(...values, isbn, location)
    .run()
}

/** isbn 単位（location 横断）の有効な蔵書件数。書影オブジェクトの孤児化防止・共有削除判定に使う */
export async function countActiveBooksByIsbn(db: D1Database, isbn: string): Promise<number> {
  const row = await db
    .prepare(`SELECT COUNT(*) AS count FROM books WHERE isbn = ?1 AND deleted_at IS NULL`)
    .bind(isbn)
    .first<{ count: number }>()
  return row?.count ?? 0
}

/** 書影は isbn 単位で R2 に1件のため、cover_src も location を問わず isbn 単位で更新する */
export async function updateCoverSrcByIsbn(
  db: D1Database,
  isbn: string,
  coverSrc: string | null,
): Promise<void> {
  await db
    .prepare(
      `UPDATE books SET cover_src = ?1, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
       WHERE isbn = ?2 AND deleted_at IS NULL`,
    )
    .bind(coverSrc, isbn)
    .run()
}

export async function findHistories(
  db: D1Database,
  borrowerEmail: string,
  location: string,
  isDone?: string,
): Promise<Array<{ history: HistoryRow; book: BookRow }>> {
  const conditions = ['h.borrower_email = ?1', 'b.location = ?2']
  const params: unknown[] = [borrowerEmail, location]
  if (isDone !== undefined) {
    conditions.push(isDone === 'true' ? 'h.return_date IS NOT NULL' : 'h.return_date IS NULL')
  }

  const { results } = await db
    .prepare(
      `SELECT h.*, b.id AS b_id, b.isbn AS b_isbn, b.location AS b_location, b.title AS b_title,
              b.author AS b_author, b.publisher AS b_publisher, b.description AS b_description,
              b.published_date AS b_published_date, b.page_count AS b_page_count, b.cover_src AS b_cover_src,
              b.total AS b_total, b.created_at AS b_created_at, b.updated_at AS b_updated_at,
              b.deleted_at AS b_deleted_at,
              b.total - (SELECT COUNT(*) FROM histories h2 WHERE h2.book_id = b.id AND h2.return_date IS NULL) AS available_count
       FROM histories h
       JOIN books b ON b.id = h.book_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY h.checkout_date DESC, h.id DESC`,
    )
    .bind(...params)
    .all<Record<string, unknown>>()

  return results.map((row) => splitHistoryBookRow(row))
}

function splitHistoryBookRow(row: Record<string, unknown>): {
  history: HistoryRow
  book: BookRow
} {
  const history: HistoryRow = {
    id: row.id as number,
    book_id: row.book_id as number,
    borrower_email: row.borrower_email as string,
    borrower_name: row.borrower_name as string | null,
    checkout_date: row.checkout_date as string,
    return_date: row.return_date as string | null,
  }

  const book: BookRow = {
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
    available_count: row.available_count as number,
    created_at: row.b_created_at as string,
    updated_at: row.b_updated_at as string | null,
    deleted_at: row.b_deleted_at as string | null,
  }

  return { history, book }
}

export async function findHistoryWithBookById(
  db: D1Database,
  id: string,
): Promise<{ history: HistoryRow; book: BookRow } | null> {
  const row = await db
    .prepare(
      `SELECT h.*, b.id AS b_id, b.isbn AS b_isbn, b.location AS b_location, b.title AS b_title,
              b.author AS b_author, b.publisher AS b_publisher, b.description AS b_description,
              b.published_date AS b_published_date, b.page_count AS b_page_count, b.cover_src AS b_cover_src,
              b.total AS b_total, b.created_at AS b_created_at, b.updated_at AS b_updated_at,
              b.deleted_at AS b_deleted_at,
              b.total - (SELECT COUNT(*) FROM histories h2 WHERE h2.book_id = b.id AND h2.return_date IS NULL) AS available_count
       FROM histories h
       JOIN books b ON b.id = h.book_id
       WHERE h.id = ?1`,
    )
    .bind(Number(id))
    .first<Record<string, unknown>>()
  if (!row) {
    return null
  }

  return splitHistoryBookRow(row)
}

export type CheckoutResult =
  | { status: 'ok'; historyId: number }
  | { status: 'no-stock' }
  | { status: 'not-found' }
  | { status: 'already-borrowed' }

/** 貸出をアトミックに実行する: 在庫は導出値なので、条件付き INSERT のみで原子化する */
export async function checkoutBook(
  db: D1Database,
  isbn: string,
  location: string,
  borrowerEmail: string,
  borrowerName: string,
): Promise<CheckoutResult> {
  try {
    const res = await db
      .prepare(
        `INSERT INTO histories (book_id, borrower_email, borrower_name)
         SELECT b.id, ?3, ?4 FROM books b
         WHERE b.isbn = ?1 AND b.location = ?2 AND b.deleted_at IS NULL
           AND b.total - (SELECT COUNT(*) FROM histories h WHERE h.book_id = b.id AND h.return_date IS NULL) > 0`,
      )
      .bind(isbn, location, borrowerEmail, borrowerName)
      .run()

    if ((res.meta.changes ?? 0) > 0) {
      return { status: 'ok', historyId: res.meta.last_row_id as number }
    }

    const book = await findBookByIsbn(db, isbn, location)
    if (!book) {
      return { status: 'not-found' }
    }

    return { status: 'no-stock' }
  } catch (err) {
    // 部分ユニークインデックス（同一人・同一本の重複未返却）違反
    if (err instanceof Error && err.message.includes('UNIQUE constraint failed')) {
      return { status: 'already-borrowed' }
    }
    throw err
  }
}

export type ReturnResult = 'ok' | 'already-returned'

/** 返却をアトミックに実行する: 在庫は導出値なので更新不要、履歴を閉じるだけでよい */
export async function returnBook(db: D1Database, historyId: string): Promise<ReturnResult> {
  const nowIso = new Date().toISOString()
  const res = await db
    .prepare(`UPDATE histories SET return_date = ?1 WHERE id = ?2 AND return_date IS NULL`)
    .bind(nowIso, Number(historyId))
    .run()

  if ((res.meta.changes ?? 0) === 0) {
    return 'already-returned'
  }

  return 'ok'
}

export type UndoNewBookResult = 'ok' | 'conflict'

/**
 * 新規登録の取り消し: 登録直後（total=1・履歴なし）のみ成立させる。
 * UNIQUE(isbn, location) が再登録を塞がないよう soft delete ではなく物理削除する
 */
export async function undoNewBook(
  db: D1Database,
  isbn: string,
  location: string,
): Promise<UndoNewBookResult> {
  const res = await db
    .prepare(
      `DELETE FROM books
       WHERE isbn = ?1 AND location = ?2 AND deleted_at IS NULL AND total = 1
         AND NOT EXISTS (SELECT 1 FROM histories h WHERE h.book_id = books.id)`,
    )
    .bind(isbn, location)
    .run()

  if ((res.meta.changes ?? 0) === 0) {
    return 'conflict'
  }

  return 'ok'
}

export type UndoReturnResult = 'ok' | 'conflict'

/** 返却の取り消し: 同一人の未返却が既にある・在庫が残っていない場合は不変条件を守るため成立させない */
export async function undoReturnBook(db: D1Database, historyId: string): Promise<UndoReturnResult> {
  const res = await db
    .prepare(
      `UPDATE histories SET return_date = NULL
       WHERE id = ?1 AND return_date IS NOT NULL
         AND NOT EXISTS (
           SELECT 1 FROM histories h2
           WHERE h2.book_id = histories.book_id
             AND h2.borrower_email = histories.borrower_email
             AND h2.return_date IS NULL
         )
         AND (SELECT b.total FROM books b WHERE b.id = histories.book_id)
           > (SELECT COUNT(*) FROM histories h3 WHERE h3.book_id = histories.book_id AND h3.return_date IS NULL)`,
    )
    .bind(Number(historyId))
    .run()

  if ((res.meta.changes ?? 0) === 0) {
    return 'conflict'
  }

  return 'ok'
}

/** バックフィル対象（cover_src 未設定 or 外部URLのまま）の isbn をカーソル以降から limit 件取得する。1件に複数 location の cover_src があっても isbn 単位で1件にまとめる */
export async function findIsbnsNeedingThumbnailBackfill(
  db: D1Database,
  limit: number,
  after?: string,
): Promise<{ isbn: string; coverSrc: string | null }[]> {
  const { results } = await db
    .prepare(
      `SELECT isbn, MAX(cover_src) AS cover_src FROM books
       WHERE deleted_at IS NULL AND (cover_src IS NULL OR cover_src LIKE 'http%')
         AND (?2 IS NULL OR isbn > ?2)
       GROUP BY isbn
       ORDER BY isbn
       LIMIT ?1`,
    )
    .bind(limit, after ?? null)
    .all<{ isbn: string; cover_src: string | null }>()
  return results.map((row) => ({ isbn: row.isbn, coverSrc: row.cover_src }))
}

/** バックフィル対象の残件数（isbn 単位） */
export async function countIsbnsNeedingThumbnailBackfill(db: D1Database): Promise<number> {
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS count FROM (
         SELECT isbn FROM books
         WHERE deleted_at IS NULL AND (cover_src IS NULL OR cover_src LIKE 'http%')
         GROUP BY isbn
       )`,
    )
    .first<{ count: number }>()
  return row?.count ?? 0
}
