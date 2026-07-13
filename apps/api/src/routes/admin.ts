import { Hono } from 'hono'

import {
  countIsbnsNeedingThumbnailBackfill,
  findIsbnsNeedingThumbnailBackfill,
  updateCoverSrcByIsbn,
} from '../db'
import { fetchExternalBookMetadata } from '../external/bookMetadata'
import { existingThumbnailSrc, ingestExternalCover, isSelfThumbnailSrc } from '../thumbnails'

import type { SessionUser } from '../auth'

export type AdminBindings = {
  DB: D1Database
  THUMBNAILS: R2Bucket
  RAKUTEN_APP_ID?: string
  RAKUTEN_ACCESS_KEY?: string
  RAKUTEN_SITE_URL?: string
}

export const adminRoutes = new Hono<{
  Bindings: AdminBindings
  Variables: { sessionUser: SessionUser }
}>()

// 1 isbn あたり外部 API + 表紙候補の検証 GET + R2 put で subrequest を多く使うため小さめに保つ
const BACKFILL_BATCH_SIZE = 3

// POST /api/admin/backfill-thumbnails — バックフィル完了後に削除する一時ルート
adminRoutes.post('/backfill-thumbnails', async (c) => {
  const targets = await findIsbnsNeedingThumbnailBackfill(c.env.DB, BACKFILL_BATCH_SIZE)

  let ingested = 0
  let refetched = 0
  let cleared = 0

  for (const { isbn, coverSrc } of targets) {
    const existing = await existingThumbnailSrc(c.env.THUMBNAILS, isbn)
    if (existing) {
      await updateCoverSrcByIsbn(c.env.DB, isbn, existing)
      ingested++
      continue
    }

    if (coverSrc && !isSelfThumbnailSrc(coverSrc)) {
      const ingestedSrc = await ingestExternalCover(c.env.THUMBNAILS, isbn, coverSrc)
      if (ingestedSrc) {
        await updateCoverSrcByIsbn(c.env.DB, isbn, ingestedSrc)
        ingested++
        continue
      }
    }

    const external = await fetchExternalBookMetadata(isbn, {
      rakuten: {
        appId: c.env.RAKUTEN_APP_ID ?? '',
        accessKey: c.env.RAKUTEN_ACCESS_KEY ?? '',
        siteUrl: c.env.RAKUTEN_SITE_URL ?? '',
      },
    })
    const externalSrc = external?.cover?.src
    if (externalSrc) {
      const refetchedSrc = await ingestExternalCover(c.env.THUMBNAILS, isbn, externalSrc)
      if (refetchedSrc) {
        await updateCoverSrcByIsbn(c.env.DB, isbn, refetchedSrc)
        refetched++
        continue
      }
    }

    await updateCoverSrcByIsbn(c.env.DB, isbn, null)
    cleared++
  }

  const remaining = await countIsbnsNeedingThumbnailBackfill(c.env.DB)

  return c.json({
    processed: targets.length,
    ingested,
    refetched,
    cleared,
    remaining,
  })
})
