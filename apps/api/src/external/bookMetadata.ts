import { XMLParser } from 'fast-xml-parser'

import { isSelfThumbnailSrc } from '../thumbnails'

/** 外部書誌（クライアントの ExternalBookInfo に対応。日付は JSON のため ISO 文字列） */
export type ExternalBookPayload = {
  isbn: string
  title: string
  author?: string
  publisher?: string
  publishedDate?: string
  description?: string
  cover: { src?: string }
}

const ndlXmlParser = new XMLParser({ ignoreDeclaration: true })

function isEmpty(value: unknown): boolean {
  if (value === undefined || value === null) {
    return true
  }

  if (typeof value === 'string' && value.trim() === '') {
    return true
  }

  if (typeof value === 'object' && value !== null) {
    const o = value as Record<string, unknown>
    if ('src' in o) {
      const src = o.src
      return src === undefined || src === '' || (typeof src === 'string' && src.trim() === '')
    }
    return Object.keys(o).length === 0
  }
  return false
}

export function stripNonEmptyEntries<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => !isEmpty(v))) as Partial<T>
}

const MIN_USABLE_COVER_BYTES = 512

function openLibraryCoverUri(isbn: string): string {
  return `https://covers.openlibrary.org/b/isbn/${encodeURIComponent(isbn)}-L.jpg`
}

/** Google Books 等の http サムネイルを HTTPS ページから読めるよう正規化する */
function normalizeCoverSrc(src: string | undefined): string | undefined {
  const trimmed = src?.trim()
  if (!trimmed) {
    return undefined
  }

  return trimmed.replace(/^http:\/\//i, 'https://')
}

/** Open Library は HEAD 200 でも 1x1 GIF になることがあるため GET で実体を確認する */
async function isUsableCoverUrl(src: string): Promise<boolean> {
  try {
    const res = await fetch(src, { method: 'GET', redirect: 'follow' })
    if (!res.ok) {
      return false
    }

    const lengthHeader = res.headers.get('content-length')
    if (lengthHeader) {
      const length = Number(lengthHeader)
      if (Number.isFinite(length) && length < MIN_USABLE_COVER_BYTES) {
        return false
      }
    }

    const buf = await res.arrayBuffer()
    return buf.byteLength >= MIN_USABLE_COVER_BYTES
  } catch {
    return false
  }
}

export async function firstUsableCoverSrc(
  ...candidates: (string | undefined)[]
): Promise<string | undefined> {
  for (const raw of candidates) {
    const src = normalizeCoverSrc(raw)
    if (!src) {
      continue
    }

    // R2 保存済みの自前サムネイルは相対パスのため fetch 検証できない。無条件に信頼する
    if (isSelfThumbnailSrc(src)) {
      return src
    }

    if (await isUsableCoverUrl(src)) {
      return src
    }
  }
  return undefined
}

// 表紙優先: OpenBD（API 応答）→ 楽天ブックス → Google → Open Library
// OpenBD の正規 CDN URL 推測 (cover.openbd.jp) と NDL 書影 API は JPRO の規約改定に伴い 2026-03 で提供終了し常に死んでいるため候補から外す
async function buildCoverSrc(
  isbn: string,
  options: { openBdSrc?: string; googleSrc?: string; rakutenSrc?: string },
): Promise<{ src?: string }> {
  const src = await firstUsableCoverSrc(
    options.openBdSrc,
    options.rakutenSrc,
    options.googleSrc,
    openLibraryCoverUri(isbn),
  )
  return { src }
}

export type MetadataCoverPatch = { src?: string; clear?: boolean }

export type BookMetadataDbPatch = {
  title?: string
  author?: string
  publisher?: string
  description?: string
  published_date?: string
  cover_src?: string | null
}

/** 外部 API の書誌を D1 UPDATE 用のカラム名に変換（在庫フィールドは含めない） */
export function metadataPatchFromExternal(
  external: ExternalBookPayload,
  cover?: MetadataCoverPatch,
): BookMetadataDbPatch {
  const payload = stripNonEmptyEntries({
    title: external.title,
    author: external.author,
    publisher: external.publisher,
    description: external.description,
    published_date: external.publishedDate,
  }) as BookMetadataDbPatch

  if (cover?.clear) {
    payload.cover_src = null
  } else if (cover?.src) {
    payload.cover_src = cover.src
  }

  return payload
}

export async function resolveMetadataCoverSrc(
  external: ExternalBookPayload,
  existingCoverSrc: string | undefined,
): Promise<MetadataCoverPatch> {
  // 自前サムネイルは外部候補との比較をせず常に維持する（外部への検証 GET も不要）
  if (isSelfThumbnailSrc(existingCoverSrc)) {
    return {}
  }

  const existingSrc = normalizeCoverSrc(existingCoverSrc)
  const resolved = await firstUsableCoverSrc(external.cover?.src, existingSrc)
  if (resolved) {
    return { src: resolved }
  }

  // 1x1 化しやすい Open Library だけ、有効な代替が無いとき削除する
  if (existingSrc?.includes('covers.openlibrary.org') && !(await isUsableCoverUrl(existingSrc))) {
    return { clear: true }
  }

  return {}
}

function parseFlexibleDate(raw: unknown): string | undefined {
  if (raw === undefined || raw === null) {
    return undefined
  }

  const s = String(raw).trim()
  if (!s) {
    return undefined
  }

  // OpenBD の pubdate は "YYYYMM" 6桁形式。new Date("202509") は year 202509 として解釈されるため先に正規化する
  if (/^\d{6}$/.test(s)) {
    return new Date(`${s.slice(0, 4)}-${s.slice(4, 6)}-01`).toISOString()
  }

  const d = new Date(s)
  if (!Number.isNaN(d.getTime())) {
    return d.toISOString()
  }

  return undefined
}

type GoogleVolumeItem = {
  volumeInfo?: {
    title?: string
    subtitle?: string
    authors?: string[]
    publisher?: string
    publishedDate?: string
    description?: string
    imageLinks?: { thumbnail?: string }
  }
}

type GoogleVolumesResponse = {
  totalItems?: number
  items?: GoogleVolumeItem[]
}

type OpenBdEntry = {
  onix?: {
    DescriptiveDetail?: {
      Subject?: Array<{
        SubjectHeadingText?: string
        SubjectSchemeIdentifier?: string
        SubjectCode?: string
      }>
    }
    CollateralDetail?: {
      TextContent?: Array<{ TextType?: string; Text?: string }>
    }
  }
  summary?: {
    title?: string
    author?: string
    publisher?: string
    cover?: string
    pubdate?: string
    isbn?: string
  }
}

function extractOpenBdDescription(onix: NonNullable<OpenBdEntry['onix']>): string | undefined {
  const texts = onix.CollateralDetail?.TextContent
  const picked = texts?.find((t) => ['03', '02', '04'].includes(t.TextType ?? ''))
  const text = picked?.Text
  return typeof text === 'string' && text.trim() !== '' ? text : undefined
}

function convertGoogleVolume(isbn: string, item: GoogleVolumeItem): ExternalBookPayload | null {
  const vi = item.volumeInfo
  const titleBase = `${vi?.title ?? ''} ${vi?.subtitle ?? ''}`.trim()
  if (!titleBase) {
    return null
  }

  return {
    isbn,
    title: titleBase,
    author: vi?.authors?.join(', '),
    publisher: vi?.publisher,
    publishedDate: parseFlexibleDate(vi?.publishedDate),
    description: vi?.description,
    cover: { src: vi?.imageLinks?.thumbnail },
  }
}

function convertOpenBdEntry(isbn: string, raw: OpenBdEntry | null): ExternalBookPayload | null {
  if (!raw?.onix || !raw.summary) {
    return null
  }

  const summary = raw.summary
  const title = summary.title?.trim()
  if (!title) {
    return null
  }

  const description = extractOpenBdDescription(raw.onix)

  return {
    isbn,
    title,
    author: summary.author,
    publisher: summary.publisher,
    publishedDate: parseFlexibleDate(summary.pubdate),
    description,
    cover: { src: summary.cover },
  }
}

function formatNdlAuthor(author: string | string[] | undefined): string | undefined {
  const normalize = (a: string) => a.replace(/,/g, '')
  if (author === undefined) {
    return undefined
  }

  if (Array.isArray(author)) {
    const parts = author.map((a) => normalize(String(a))).filter(Boolean)
    return parts.length > 0 ? parts.join(', ') : undefined
  }
  const one = normalize(String(author))
  return one.trim() === '' ? undefined : one
}

function convertNdlOpenSearch(isbn: string, xml: string): ExternalBookPayload | null {
  let parsed: unknown
  try {
    parsed = ndlXmlParser.parse(xml)
  } catch {
    return null
  }

  const rss = (parsed as { rss?: { channel?: { item?: unknown } } }).rss
  const item = rss?.channel?.item
  if (item === undefined || item === null) {
    return null
  }

  const first = Array.isArray(item) ? item[0] : item
  if (!first || typeof first !== 'object') {
    return null
  }

  const row = first as Record<string, unknown>
  const title = row.title
  if (typeof title !== 'string' || title.trim() === '') {
    return null
  }

  return {
    isbn,
    title,
    author: formatNdlAuthor(row['dc:creator'] as string | string[] | undefined),
    publisher:
      typeof row['dc:publisher'] === 'string' && row['dc:publisher'].trim() !== ''
        ? row['dc:publisher']
        : undefined,
    publishedDate: parseFlexibleDate(row['dcterms:issued']),
    cover: {},
  }
}

async function fetchGoogleVolume(isbn: string): Promise<ExternalBookPayload | null> {
  const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(isbn)}&maxResults=1`
  const res = await fetch(url)
  if (!res.ok) {
    return null
  }

  const data = (await res.json()) as GoogleVolumesResponse
  if (!data.totalItems || data.totalItems <= 0 || !data.items?.[0]) {
    return null
  }

  return convertGoogleVolume(isbn, data.items[0])
}

type RakutenBooksResponse = {
  Items?: Array<{ Item?: { largeImageUrl?: string; mediumImageUrl?: string } }>
}

export async function fetchRakutenCoverSrc(
  isbn: string,
  appId: string,
): Promise<string | undefined> {
  try {
    const url = `https://app.rakuten.co.jp/services/api/BooksBook/Search/20170404?format=json&isbn=${encodeURIComponent(isbn)}&applicationId=${encodeURIComponent(appId)}`
    const res = await fetch(url)
    if (!res.ok) {
      return undefined
    }

    const data = (await res.json()) as RakutenBooksResponse
    const item = data.Items?.[0]?.Item
    return item?.largeImageUrl || item?.mediumImageUrl || undefined
  } catch {
    return undefined
  }
}

async function fetchOpenBd(isbn: string): Promise<ExternalBookPayload | null> {
  const res = await fetch(`https://api.openbd.jp/v1/get?isbn=${encodeURIComponent(isbn)}`)
  if (!res.ok) {
    return null
  }

  const data = (await res.json()) as Array<OpenBdEntry | null>
  const first = data[0]
  if (!first) {
    return null
  }

  const converted = convertOpenBdEntry(isbn, first)
  if (!converted) {
    return null
  }

  return converted
}

async function mergeGoogleAndOpenBd(
  isbn: string,
  openBd: ExternalBookPayload | null,
  google: ExternalBookPayload | null,
  rakutenSrc?: string,
): Promise<ExternalBookPayload | null> {
  if (!openBd && !google) {
    return null
  }

  if (!openBd && google) {
    const cover = await buildCoverSrc(isbn, { googleSrc: google.cover?.src, rakutenSrc })
    return { ...google, isbn, cover }
  }
  if (openBd && !google) {
    const cover = await buildCoverSrc(isbn, { openBdSrc: openBd.cover?.src, rakutenSrc })
    return { ...openBd, isbn, cover }
  }

  const o = stripNonEmptyEntries(
    openBd as unknown as Record<string, unknown>,
  ) as Partial<ExternalBookPayload>
  const g = stripNonEmptyEntries(
    google as unknown as Record<string, unknown>,
  ) as Partial<ExternalBookPayload>

  const title = `${g.title ?? o.title ?? ''}`.trim()
  if (!title) {
    return null
  }

  const cover = await buildCoverSrc(isbn, {
    openBdSrc: openBd?.cover?.src,
    googleSrc: google?.cover?.src,
    rakutenSrc,
  })

  return {
    ...o,
    ...g,
    isbn,
    title,
    cover,
  }
}

export async function fetchExternalBookMetadata(
  isbn: string,
  options?: { rakutenAppId?: string },
): Promise<ExternalBookPayload | null> {
  const rakutenAppId = options?.rakutenAppId
  const [google, openBd, rakutenSrc] = await Promise.all([
    fetchGoogleVolume(isbn),
    fetchOpenBd(isbn),
    rakutenAppId ? fetchRakutenCoverSrc(isbn, rakutenAppId) : Promise.resolve(undefined),
  ])
  const primary = await mergeGoogleAndOpenBd(isbn, openBd, google, rakutenSrc)
  if (primary?.title) {
    return primary
  }

  const ndlRes = await fetch(
    `https://ndlsearch.ndl.go.jp/api/opensearch?isbn=${encodeURIComponent(isbn)}&cnt=1`,
  )
  if (!ndlRes.ok) {
    return null
  }

  const xml = await ndlRes.text()
  const ndl = convertNdlOpenSearch(isbn, xml)
  if (!ndl?.title) {
    return null
  }

  const cover = await buildCoverSrc(isbn, { rakutenSrc })

  return { ...ndl, cover }
}
