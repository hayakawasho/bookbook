import { Hono } from 'hono'

import {
  addBookCopy,
  bookFromRow,
  findBookByIsbn,
  findBooks,
  insertBook,
  isLocation,
  updateBookMetadata,
} from '../db'
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

// POST /api/books/:isbn/copies — 蔵書を1冊追加する（意図ベース。CAS ではなく total+1 の原子更新）
booksRoutes.post('/:isbn/copies', async (c) => {
  const isbn = c.req.param('isbn')
  const { location } = await c.req.json<{ location: string }>()

  if (!isLocation(location)) {
    return c.json({ error: 'unknown location' }, 400)
  }

  const updated = await addBookCopy(c.env.DB, isbn, location)
  if (!updated) {
    return c.json({ error: 'book not found' }, 404)
  }

  return c.json({ book: bookFromRow(updated) })
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
