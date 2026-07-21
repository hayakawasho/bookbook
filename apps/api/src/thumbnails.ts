export const MAX_THUMBNAIL_BYTES = 2 * 1024 * 1024
export const MIN_THUMBNAIL_BYTES = 512

const ALLOWED_CONTENT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export function thumbnailKey(isbn: string): string {
  return `covers/${isbn}`
}

export function selfThumbnailSrc(isbn: string): string {
  return `/api/thumbnails/${isbn}`
}

export function isSelfThumbnailSrc(src: string | undefined): boolean {
  return src !== undefined && src.startsWith('/api/thumbnails/')
}

/** 書誌 API が返しうる表紙ホスト（archive.org は Open Library のリダイレクト先） */
const ALLOWED_COVER_HOST_SUFFIXES = [
  'openbd.jp',
  'rakuten.co.jp',
  'google.com',
  'googleusercontent.com',
  'openlibrary.org',
  'archive.org',
]

/** クライアント経由で渡る外部表紙 URL を SSRF・踏み台防止のため https + 許可ホストに限定する */
export function isAllowedExternalCoverUrl(src: string): boolean {
  let url: URL
  try {
    url = new URL(src)
  } catch {
    return false
  }

  if (url.protocol !== 'https:') {
    return false
  }

  return ALLOWED_COVER_HOST_SUFFIXES.some(
    (suffix) => url.hostname === suffix || url.hostname.endsWith(`.${suffix}`),
  )
}

export function isAllowedThumbnailContentType(ct: string | null): boolean {
  if (!ct) {
    return false
  }

  const mediaType = ct.split(';')[0]?.trim().toLowerCase()
  return mediaType !== undefined && ALLOWED_CONTENT_TYPES.has(mediaType)
}

/** 外部表紙を R2 に取り込む。フォールバック前提のため例外を投げず null を返す */
export async function ingestExternalCover(
  bucket: R2Bucket,
  isbn: string,
  externalUrl: string,
): Promise<string | null> {
  if (!isAllowedExternalCoverUrl(externalUrl)) {
    return null
  }

  try {
    const res = await fetch(externalUrl, { redirect: 'follow' })
    if (!res.ok) {
      return null
    }

    const contentType = res.headers.get('content-type')
    if (!isAllowedThumbnailContentType(contentType)) {
      return null
    }

    const buf = await res.arrayBuffer()
    if (buf.byteLength < MIN_THUMBNAIL_BYTES || buf.byteLength > MAX_THUMBNAIL_BYTES) {
      return null
    }

    await bucket.put(thumbnailKey(isbn), buf, {
      httpMetadata: { contentType: contentType ?? undefined },
    })

    return selfThumbnailSrc(isbn)
  } catch {
    return null
  }
}

export async function existingThumbnailSrc(bucket: R2Bucket, isbn: string): Promise<string | null> {
  const head = await bucket.head(thumbnailKey(isbn))
  return head ? selfThumbnailSrc(isbn) : null
}
