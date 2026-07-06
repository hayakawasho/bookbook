import { Hono } from 'hono'

import {
  bookFromRow,
  findBookByIsbn,
  findBooks,
  insertBook,
  isLocation,
  updateBookCount,
  updateBookMetadata,
} from '../db'
import { validateStockTransition } from '../domain/stockTransition'
import {
  fetchExternalBookMetadata,
  metadataPatchFromExternal,
  resolveMetadataCoverSrc,
} from '../external/bookMetadata'
import { sendSlackNotification } from '../external/slack'

import type { SessionUser } from '../auth'

export type BooksBindings = {
  DB: D1Database
  SLACK_WEBHOOK_URL: string
}

export const booksRoutes = new Hono<{
  Bindings: BooksBindings
  Variables: { sessionUser: SessionUser }
}>()

// GET /api/books?q=&location=
booksRoutes.get('/', async (c) => {
  const { q = '', location } = c.req.query()
  if (!location) {
    return c.json({ error: 'location is required' }, 400)
  }

  if (!isLocation(location)) {
    return c.json({ error: 'unknown location' }, 400)
  }

  const rows = await findBooks(c.env.DB, location, q)
  return c.json(rows.map(bookFromRow))
})

// GET /api/books/:isbn?location=
booksRoutes.get('/:isbn', async (c) => {
  const isbn = c.req.param('isbn')
  const { location } = c.req.query()
  if (!location) {
    return c.json({ error: 'location is required' }, 400)
  }

  if (!isLocation(location)) {
    return c.json({ error: 'unknown location' }, 400)
  }

  const row = await findBookByIsbn(c.env.DB, isbn, location)
  if (row) {
    return c.json({ status: 'registered', book: bookFromRow(row) })
  }

  const external = await fetchExternalBookMetadata(isbn)
  if (external?.title) {
    return c.json({ status: 'external', book: external })
  }

  return c.json({ status: 'notfound' }, 404)
})

// POST /api/books
booksRoutes.post('/', async (c) => {
  const body = await c.req.json<{
    isbn: string
    title: string
    author?: string
    publisher?: string
    cover?: { src?: string }
    description?: string
    location: string
  }>()

  if (!isLocation(body.location)) {
    return c.json({ error: 'unknown location' }, 400)
  }

  const created = await insertBook(c.env.DB, {
    isbn: body.isbn,
    title: body.title,
    author: body.author || undefined,
    publisher: body.publisher || undefined,
    description: body.description || undefined,
    coverSrc: body.cover?.src || undefined,
    location: body.location,
  })

  if (created) {
    await sendSlackNotification(c.env.SLACK_WEBHOOK_URL, 'new-book', body.location, {
      title: body.title,
      author: body.author,
      isbn: body.isbn,
    })
  }

  return c.json({ ok: true }, 201)
})

// PATCH /api/books/:isbn/count — 在庫数の更新（クライアント計算値をサーバーで遷移検証）
booksRoutes.patch('/:isbn/count', async (c) => {
  const isbn = c.req.param('isbn')
  const { availableCount, total, location } = await c.req.json<{
    availableCount: number
    total: number
    location: string
  }>()

  if (!isLocation(location)) {
    return c.json({ error: 'unknown location' }, 400)
  }

  const book = await findBookByIsbn(c.env.DB, isbn, location)
  if (!book) {
    return c.json({ error: 'book not found' }, 404)
  }

  const validation = validateStockTransition(
    { available_count: book.available_count, total: book.total },
    { availableCount, total },
  )

  if (!validation.ok) {
    const status = validation.reason === 'invalid stock transition' ? 400 : 409
    return c.json({ error: validation.reason }, status)
  }

  const updated = await updateBookCount(
    c.env.DB,
    isbn,
    location,
    { availableCount: book.available_count, total: book.total },
    { availableCount, total },
  )

  if (!updated) {
    return c.json({ error: 'conflict' }, 409)
  }

  return c.json({ ok: true })
})

// PATCH /api/books/:isbn/metadata — 外部 API の書誌で更新（在庫は変更しない）
booksRoutes.patch('/:isbn/metadata', async (c) => {
  const isbn = c.req.param('isbn')
  const { location } = await c.req.json<{ location: string }>()
  if (!location) {
    return c.json({ error: 'location is required' }, 400)
  }

  if (!isLocation(location)) {
    return c.json({ error: 'unknown location' }, 400)
  }

  const existing = await findBookByIsbn(c.env.DB, isbn, location)
  if (!existing) {
    return c.json({ error: 'book not found' }, 404)
  }

  const external = await fetchExternalBookMetadata(isbn)
  if (!external?.title) {
    return c.json({ error: 'external metadata not found' }, 404)
  }

  const coverPatch = await resolveMetadataCoverSrc(external, existing.cover_src ?? undefined, isbn)
  const patch = metadataPatchFromExternal(external, coverPatch)

  await updateBookMetadata(c.env.DB, isbn, location, patch)

  const updated = await findBookByIsbn(c.env.DB, isbn, location)
  if (!updated) {
    return c.json({ error: 'book not found after update' }, 502)
  }

  return c.json({ book: bookFromRow(updated) })
})
