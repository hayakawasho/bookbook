import { Hono } from 'hono'

import {
  checkoutBook,
  findHistories,
  findHistoryWithBookById,
  historyFromRow,
  isLocation,
  returnBook,
} from '../db'
import { sendSlackNotification } from '../external/slack'

import type { SessionUser } from '../auth'

export type HistoryBindings = {
  DB: D1Database
  SLACK_WEBHOOK_URL: string
}

export const historyRoutes = new Hono<{
  Bindings: HistoryBindings
  Variables: { sessionUser: SessionUser }
}>()

// GET /api/history?location=&isDone=
historyRoutes.get('/', async (c) => {
  const sessionUser = c.get('sessionUser')
  const { location, isDone } = c.req.query()
  if (!location) {
    return c.json({ error: 'location is required' }, 400)
  }

  if (!isLocation(location)) {
    return c.json({ error: 'unknown location' }, 400)
  }

  const rows = await findHistories(c.env.DB, sessionUser.email, location, isDone)
  return c.json(rows.map(({ history, book }) => historyFromRow(history, book)))
})

// POST /api/history（貸出）
historyRoutes.post('/', async (c) => {
  const { isbn, location } = await c.req.json<{ isbn: string; location: string }>()
  const sessionUser = c.get('sessionUser')

  if (!isLocation(location)) {
    return c.json({ error: 'unknown location' }, 400)
  }

  const result = await checkoutBook(
    c.env.DB,
    isbn,
    location,
    sessionUser.email,
    sessionUser.name ?? '',
  )

  if (result.status === 'not-found') {
    return c.json({ error: 'book not found' }, 404)
  }

  if (result.status === 'no-stock') {
    return c.json({ error: 'no stock available' }, 409)
  }

  const record = await findHistoryWithBookById(c.env.DB, String(result.historyId))
  if (!record) {
    return c.json({ error: 'history not found after checkout' }, 502)
  }

  const json = historyFromRow(record.history, record.book)

  await sendSlackNotification(
    c.env.SLACK_WEBHOOK_URL,
    'checkout',
    location,
    { title: json.title, author: json.author, isbn },
    sessionUser,
  )

  return c.json(json, 201)
})

// PATCH /api/history/:id（返却）
historyRoutes.patch('/:id', async (c) => {
  const sessionUser = c.get('sessionUser')
  const id = c.req.param('id')

  const record = await findHistoryWithBookById(c.env.DB, id)
  if (!record) {
    return c.json({ error: 'history not found' }, 404)
  }

  const recordEmail = record.history.borrower_email.trim().toLowerCase()
  const sessionEmail = sessionUser.email.trim().toLowerCase()
  if (recordEmail !== sessionEmail) {
    return c.json({ error: 'forbidden' }, 403)
  }

  const result = await returnBook(c.env.DB, id)
  if (result === 'already-returned') {
    return c.json({ error: 'already returned' }, 409)
  }

  await sendSlackNotification(c.env.SLACK_WEBHOOK_URL, 'return', record.history.location, {
    title: record.book?.title ?? '',
    author: record.book?.author ?? undefined,
    isbn: record.history.isbn,
  })

  return c.json({ ok: true })
})
