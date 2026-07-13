import { Hono } from 'hono'

import {
  addBookCopy,
  bookFromRow,
  countActiveBooksByIsbn,
  findBookByIsbn,
  findBooks,
  insertBook,
  isLocation,
  undoNewBook,
  updateBookMetadata,
  updateCoverSrcByIsbn,
} from '../db'
import {
  fetchExternalBookMetadata,
  metadataPatchFromExternal,
  resolveMetadataCoverSrc,
} from '../external/bookMetadata'
import { sendSlackNotification } from '../external/slack'
import {
  existingThumbnailSrc,
  ingestExternalCover,
  isAllowedThumbnailContentType,
  isSelfThumbnailSrc,
  MAX_THUMBNAIL_BYTES,
  MIN_THUMBNAIL_BYTES,
  selfThumbnailSrc,
  thumbnailKey,
} from '../thumbnails'

import type { SessionUser } from '../auth'

export type BooksBindings = {
  DB: D1Database
  THUMBNAILS: R2Bucket
  SLACK_WEBHOOK_URL: string
  RAKUTEN_APP_ID?: string
  RAKUTEN_ACCESS_KEY?: string
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

  const external = await fetchExternalBookMetadata(isbn, {
    rakuten: {
      appId: c.env.RAKUTEN_APP_ID ?? '',
      accessKey: c.env.RAKUTEN_ACCESS_KEY ?? '',
    },
  })
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

  const externalCoverSrc = body.cover?.src || undefined
  let coverSrc = externalCoverSrc
  if (!coverSrc || !isSelfThumbnailSrc(coverSrc)) {
    // 他 location で取り込み・撮影済みなら R2 に既にあるため、外部 fetch せず self URL から始める
    const existing = await existingThumbnailSrc(c.env.THUMBNAILS, body.isbn)
    if (existing) {
      coverSrc = existing
    }
  }

  const created = await insertBook(c.env.DB, {
    isbn: body.isbn,
    title: body.title,
    author: body.author || undefined,
    publisher: body.publisher || undefined,
    description: body.description || undefined,
    coverSrc,
    location: body.location,
  })

  if (created) {
    await sendSlackNotification(c.env.SLACK_WEBHOOK_URL, 'new-book', body.location, {
      title: body.title,
      author: body.author,
      publisher: body.publisher,
      description: body.description,
      coverSrc: externalCoverSrc,
    })

    if (coverSrc && !isSelfThumbnailSrc(coverSrc)) {
      const isbn = body.isbn
      const externalUrl = coverSrc
      c.executionCtx.waitUntil(
        ingestExternalCover(c.env.THUMBNAILS, isbn, externalUrl)
          .then((selfSrc) => {
            if (selfSrc) {
              return updateCoverSrcByIsbn(c.env.DB, isbn, selfSrc)
            }
          })
          .catch(() => {}),
      )
    }
  }

  return c.json({ ok: true }, 201)
})

// DELETE /api/books/:isbn?location= — 新規登録の取り消し（登録直後・履歴なしのみ成立）
booksRoutes.delete('/:isbn', async (c) => {
  const isbn = c.req.param('isbn')
  const { location } = c.req.query()
  if (!location) {
    return c.json({ error: 'location is required' }, 400)
  }

  if (!isLocation(location)) {
    return c.json({ error: 'unknown location' }, 400)
  }

  const row = await findBookByIsbn(c.env.DB, isbn, location)
  if (!row) {
    return c.json({ error: 'book not found' }, 404)
  }

  const result = await undoNewBook(c.env.DB, isbn, location)
  if (result === 'conflict') {
    return c.json({ error: 'cannot undo registration' }, 409)
  }

  const remaining = await countActiveBooksByIsbn(c.env.DB, isbn)
  if (remaining === 0) {
    // 他 location に同 isbn が残っていれば書影は共有中のため消さない
    c.executionCtx.waitUntil(c.env.THUMBNAILS.delete(thumbnailKey(isbn)).catch(() => {}))
  }

  await sendSlackNotification(c.env.SLACK_WEBHOOK_URL, 'cancel-new-book', location, {
    title: row.title,
  })

  return c.json({ ok: true })
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

// PUT /api/books/:isbn/thumbnail — 撮影した表紙画像を R2 に保存する（body は画像バイナリそのもの）
booksRoutes.put('/:isbn/thumbnail', async (c) => {
  const isbn = c.req.param('isbn')

  const contentType = c.req.header('Content-Type') ?? null
  if (!isAllowedThumbnailContentType(contentType)) {
    return c.json({ error: 'unsupported content type' }, 415)
  }

  const buf = await c.req.arrayBuffer()
  if (buf.byteLength < MIN_THUMBNAIL_BYTES) {
    return c.json({ error: 'thumbnail too small' }, 400)
  }
  if (buf.byteLength > MAX_THUMBNAIL_BYTES) {
    return c.json({ error: 'thumbnail too large' }, 413)
  }

  const activeCount = await countActiveBooksByIsbn(c.env.DB, isbn)
  if (activeCount === 0) {
    return c.json({ error: 'book not found' }, 404)
  }

  await c.env.THUMBNAILS.put(thumbnailKey(isbn), buf, {
    httpMetadata: { contentType: contentType ?? undefined },
  })
  await updateCoverSrcByIsbn(c.env.DB, isbn, selfThumbnailSrc(isbn))

  return c.json({ cover: { src: selfThumbnailSrc(isbn) } })
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

  const external = await fetchExternalBookMetadata(isbn, {
    rakuten: {
      appId: c.env.RAKUTEN_APP_ID ?? '',
      accessKey: c.env.RAKUTEN_ACCESS_KEY ?? '',
    },
  })
  if (!external?.title) {
    return c.json({ error: 'external metadata not found' }, 404)
  }

  const coverPatch = await resolveMetadataCoverSrc(external, existing.cover_src ?? undefined)
  if (coverPatch.src && !isSelfThumbnailSrc(coverPatch.src)) {
    const existingSelf = await existingThumbnailSrc(c.env.THUMBNAILS, isbn)
    const ingested =
      existingSelf ?? (await ingestExternalCover(c.env.THUMBNAILS, isbn, coverPatch.src))
    if (ingested) {
      coverPatch.src = ingested
    }
  }

  const patch = metadataPatchFromExternal(external, coverPatch)

  await updateBookMetadata(c.env.DB, isbn, location, patch)

  const updated = await findBookByIsbn(c.env.DB, isbn, location)
  if (!updated) {
    return c.json({ error: 'book not found after update' }, 502)
  }

  return c.json({ book: bookFromRow(updated) })
})
