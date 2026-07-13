import { env } from 'cloudflare:test'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { signSession } from '../auth'
import { canonicalOpenBdCoverUri } from '../external/bookMetadata'
import app from '../index'
import { selfThumbnailSrc, thumbnailKey } from '../thumbnails'

function bytes(length: number, fill = 1): Uint8Array {
  return new Uint8Array(length).fill(fill)
}

async function seedBook(isbn: string, coverSrc: string | null, location = 'daikanyama') {
  await env.DB.prepare(
    `INSERT INTO books (isbn, location, title, cover_src, total) VALUES (?, ?, 'サンプル本', ?, 1)`,
  )
    .bind(isbn, location, coverSrc)
    .run()
}

async function sessionCookie(email = 'user@example.com', name = 'Tester') {
  const token = await signSession(env.AUTH_COOKIE_SECRET, { email, name, hd: 'example.com' }, 3600)
  return `bookbook_session=${token}`
}

async function backfill(cookie: string) {
  const res = await app.fetch(
    new Request('http://localhost/api/admin/backfill-thumbnails', {
      method: 'POST',
      headers: { Cookie: cookie },
    }),
    env,
  )
  const body = (await res.json()) as {
    processed: number
    ingested: number
    refetched: number
    cleared: number
    remaining: number
  }
  return { res, body }
}

function coverRow(isbn: string) {
  return env.DB.prepare('SELECT cover_src FROM books WHERE isbn = ?')
    .bind(isbn)
    .first<{ cover_src: string | null }>()
}

/** 外部 API (google/openbd) は既定で空を返す最小限のスタブ。テストごとに必要な URL だけ上書きする */
function stubFetch(handlers: Record<string, () => Response>) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      for (const [pattern, handler] of Object.entries(handlers)) {
        if (url.includes(pattern)) {
          return handler()
        }
      }
      if (url.includes('googleapis.com/books')) {
        return new Response(JSON.stringify({ totalItems: 0 }), { status: 200 })
      }
      if (url.includes('api.openbd.jp')) {
        return new Response(JSON.stringify([null]), { status: 200 })
      }
      return new Response('', { status: 404 })
    }),
  )
}

beforeEach(async () => {
  vi.restoreAllMocks()
  await env.DB.exec('DELETE FROM histories')
  await env.DB.exec('DELETE FROM books')
  const list = await env.THUMBNAILS.list()
  await Promise.all(list.objects.map((obj) => env.THUMBNAILS.delete(obj.key)))
})

describe('POST /api/admin/backfill-thumbnails', () => {
  it('生きた外部URLはそのまま取り込みselfURLに更新する', async () => {
    const isbn = '9784000000101'
    await seedBook(isbn, 'https://example.com/live.jpg')
    const cookie = await sessionCookie()
    stubFetch({
      'example.com/live.jpg': () =>
        new Response(bytes(600), { status: 200, headers: { 'Content-Type': 'image/jpeg' } }),
    })

    const { res, body } = await backfill(cookie)
    expect(res.status).toBe(200)
    expect(body).toMatchObject({
      processed: 1,
      ingested: 1,
      refetched: 0,
      cleared: 0,
      remaining: 0,
    })

    expect((await coverRow(isbn))?.cover_src).toBe(selfThumbnailSrc(isbn))
    expect(await env.THUMBNAILS.head(thumbnailKey(isbn))).not.toBeNull()
  })

  it('404の外部URLは外部API再解決で成功しselfURLに更新する', async () => {
    const isbn = '9784000000102'
    await seedBook(isbn, 'https://example.com/dead.jpg')
    const cookie = await sessionCookie()
    stubFetch({
      'example.com/dead.jpg': () => new Response('', { status: 404 }),
      'api.openbd.jp': () =>
        new Response(
          JSON.stringify([
            {
              onix: { DescriptiveDetail: {}, CollateralDetail: {} },
              summary: { title: '再解決本', cover: canonicalOpenBdCoverUri(isbn) },
            },
          ]),
          { status: 200 },
        ),
      'cover.openbd.jp/': () =>
        new Response(bytes(600), { status: 200, headers: { 'Content-Type': 'image/jpeg' } }),
    })

    const { res, body } = await backfill(cookie)
    expect(res.status).toBe(200)
    expect(body).toMatchObject({
      processed: 1,
      ingested: 0,
      refetched: 1,
      cleared: 0,
      remaining: 0,
    })

    expect((await coverRow(isbn))?.cover_src).toBe(selfThumbnailSrc(isbn))
  })

  it('再解決も失敗すればcover_srcをNULL化する', async () => {
    const isbn = '9784000000103'
    await seedBook(isbn, 'https://example.com/gone.jpg')
    const cookie = await sessionCookie()
    stubFetch({
      'example.com/gone.jpg': () => new Response('', { status: 404 }),
    })

    const { res, body } = await backfill(cookie)
    expect(res.status).toBe(200)
    // cover_src が NULL の行は「未解決」として今後も再挑戦対象であり続けるため remaining に残る
    expect(body).toMatchObject({
      processed: 1,
      ingested: 0,
      refetched: 0,
      cleared: 1,
      remaining: 1,
    })

    expect((await coverRow(isbn))?.cover_src).toBeNull()
  })

  it('既にselfURLの行は対象外', async () => {
    const isbn = '9784000000104'
    await seedBook(isbn, selfThumbnailSrc(isbn))
    const cookie = await sessionCookie()
    stubFetch({})

    const { res, body } = await backfill(cookie)
    expect(res.status).toBe(200)
    expect(body).toMatchObject({ processed: 0, remaining: 0 })

    expect((await coverRow(isbn))?.cover_src).toBe(selfThumbnailSrc(isbn))
  })

  it('解決不能なNULL行がバッチを占有せず外部URL行を先に処理する', async () => {
    const nullIsbns = Array.from({ length: 5 }, (_, i) => `978400000030${i}`)
    for (const isbn of nullIsbns) {
      await seedBook(isbn, null)
    }
    const liveIsbn = '9784999999999'
    await seedBook(liveIsbn, 'https://example.com/live.jpg')
    const cookie = await sessionCookie()
    stubFetch({
      'example.com/live.jpg': () =>
        new Response(bytes(600), { status: 200, headers: { 'Content-Type': 'image/jpeg' } }),
    })

    const { res, body } = await backfill(cookie)
    expect(res.status).toBe(200)
    expect(body.ingested).toBe(1)
    expect((await coverRow(liveIsbn))?.cover_src).toBe(selfThumbnailSrc(liveIsbn))
  })

  it('remainingはバッチサイズを超えた残り件数を正しく返す', async () => {
    const isbns = Array.from({ length: 6 }, (_, i) => `978400000020${i}`)
    for (const isbn of isbns) {
      await seedBook(isbn, null)
    }
    const cookie = await sessionCookie()
    // openbd の応答は isbn ごとに作り分ける必要があるため stubFetch の固定パターンではなく専用ハンドラを使う
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('api.openbd.jp')) {
          const isbn = new URL(url).searchParams.get('isbn') ?? ''
          return new Response(
            JSON.stringify([
              {
                onix: { DescriptiveDetail: {}, CollateralDetail: {} },
                summary: { title: '一括本', cover: canonicalOpenBdCoverUri(isbn) },
              },
            ]),
            { status: 200 },
          )
        }
        if (url.includes('cover.openbd.jp/')) {
          return new Response(bytes(600), {
            status: 200,
            headers: { 'Content-Type': 'image/jpeg' },
          })
        }
        if (url.includes('googleapis.com/books')) {
          return new Response(JSON.stringify({ totalItems: 0 }), { status: 200 })
        }
        return new Response('', { status: 404 })
      }),
    )

    const first = await backfill(cookie)
    expect(first.body.processed).toBe(3)
    expect(first.body.remaining).toBe(3)

    const second = await backfill(cookie)
    expect(second.body.processed).toBe(3)
    expect(second.body.remaining).toBe(0)
  })
})
