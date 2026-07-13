import { Hono } from 'hono'

import { thumbnailKey } from '../thumbnails'

import type { SessionUser } from '../auth'

export type ThumbnailsBindings = {
  THUMBNAILS: R2Bucket
}

export const thumbnailsRoutes = new Hono<{
  Bindings: ThumbnailsBindings
  Variables: { sessionUser: SessionUser }
}>()

// GET /api/thumbnails/:isbn
thumbnailsRoutes.get('/:isbn', async (c) => {
  const isbn = c.req.param('isbn')

  const object = await c.env.THUMBNAILS.get(thumbnailKey(isbn))
  if (!object) {
    return c.json({ error: 'thumbnail not found' }, 404)
  }

  const headers = {
    'Content-Type': object.httpMetadata?.contentType ?? 'image/jpeg',
    'Cache-Control': 'private, max-age=86400',
    ETag: object.httpEtag,
  }

  const ifNoneMatch = c.req.header('If-None-Match')
  if (ifNoneMatch === object.httpEtag) {
    return c.body(null, 304, headers)
  }

  return c.body(object.body, 200, headers)
})
