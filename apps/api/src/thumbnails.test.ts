import { env } from 'cloudflare:test'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  existingThumbnailSrc,
  ingestExternalCover,
  isAllowedThumbnailContentType,
  isSelfThumbnailSrc,
  MAX_THUMBNAIL_BYTES,
  MIN_THUMBNAIL_BYTES,
  selfThumbnailSrc,
  thumbnailKey,
} from './thumbnails'

const ISBN = '9784873119038'

function bytes(length: number): Uint8Array {
  return new Uint8Array(length).fill(1)
}

function fetchOk(body: Uint8Array, contentType = 'image/jpeg') {
  return vi.fn().mockResolvedValue(
    new Response(body, {
      status: 200,
      headers: { 'Content-Type': contentType },
    }),
  )
}

beforeEach(async () => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  const list = await env.THUMBNAILS.list()
  await Promise.all(list.objects.map((obj) => env.THUMBNAILS.delete(obj.key)))
})

describe('isSelfThumbnailSrc', () => {
  it('自前配信 URL は true', () => {
    expect(isSelfThumbnailSrc(selfThumbnailSrc(ISBN))).toBe(true)
    expect(isSelfThumbnailSrc('/api/thumbnails/9784000000000')).toBe(true)
  })

  it('外部 URL や undefined は false', () => {
    expect(isSelfThumbnailSrc('https://example.com/cover.jpg')).toBe(false)
    expect(isSelfThumbnailSrc(undefined)).toBe(false)
  })
})

describe('isAllowedThumbnailContentType', () => {
  it('許可された image/* は true', () => {
    expect(isAllowedThumbnailContentType('image/jpeg')).toBe(true)
    expect(isAllowedThumbnailContentType('image/png')).toBe(true)
    expect(isAllowedThumbnailContentType('image/webp')).toBe(true)
  })

  it('パラメータ付きでも主要部分で判定する', () => {
    expect(isAllowedThumbnailContentType('image/jpeg; charset=binary')).toBe(true)
  })

  it('許可外・null は false', () => {
    expect(isAllowedThumbnailContentType('text/html')).toBe(false)
    expect(isAllowedThumbnailContentType(null)).toBe(false)
  })
})

describe('ingestExternalCover', () => {
  it('正常系: R2 に put され self URL が返り contentType が保存される', async () => {
    vi.stubGlobal('fetch', fetchOk(bytes(MIN_THUMBNAIL_BYTES), 'image/png'))

    const result = await ingestExternalCover(env.THUMBNAILS, ISBN, 'https://example.com/cover.png')

    expect(result).toBe(selfThumbnailSrc(ISBN))
    const stored = await env.THUMBNAILS.get(thumbnailKey(ISBN))
    expect(stored).not.toBeNull()
    expect(stored?.httpMetadata?.contentType).toBe('image/png')
    expect(await stored?.arrayBuffer()).toEqual(bytes(MIN_THUMBNAIL_BYTES).buffer)
  })

  it('fetch がネットワークエラーなら null', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')))

    const result = await ingestExternalCover(env.THUMBNAILS, ISBN, 'https://example.com/cover.jpg')

    expect(result).toBeNull()
    expect(await env.THUMBNAILS.head(thumbnailKey(ISBN))).toBeNull()
  })

  it('fetch が非 2xx なら null', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 404 })))

    const result = await ingestExternalCover(env.THUMBNAILS, ISBN, 'https://example.com/cover.jpg')

    expect(result).toBeNull()
  })

  it('Content-Type が許可外なら null', async () => {
    vi.stubGlobal('fetch', fetchOk(bytes(MIN_THUMBNAIL_BYTES), 'text/html'))

    const result = await ingestExternalCover(env.THUMBNAILS, ISBN, 'https://example.com/cover.jpg')

    expect(result).toBeNull()
  })

  it('サイズが下限未満なら null', async () => {
    vi.stubGlobal('fetch', fetchOk(bytes(MIN_THUMBNAIL_BYTES - 1)))

    const result = await ingestExternalCover(env.THUMBNAILS, ISBN, 'https://example.com/cover.jpg')

    expect(result).toBeNull()
  })

  it('サイズが上限超過なら null', async () => {
    vi.stubGlobal('fetch', fetchOk(bytes(MAX_THUMBNAIL_BYTES + 1)))

    const result = await ingestExternalCover(env.THUMBNAILS, ISBN, 'https://example.com/cover.jpg')

    expect(result).toBeNull()
  })
})

describe('existingThumbnailSrc', () => {
  it('R2 に存在すれば self URL を返す', async () => {
    await env.THUMBNAILS.put(thumbnailKey(ISBN), bytes(MIN_THUMBNAIL_BYTES), {
      httpMetadata: { contentType: 'image/jpeg' },
    })

    expect(await existingThumbnailSrc(env.THUMBNAILS, ISBN)).toBe(selfThumbnailSrc(ISBN))
  })

  it('存在しなければ null', async () => {
    expect(await existingThumbnailSrc(env.THUMBNAILS, ISBN)).toBeNull()
  })
})
