import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchExternalBookMetadata, fetchRakutenCoverSrc } from './bookMetadata'

const ISBN = '9784000000201'
const RAKUTEN_COVER_SRC = 'https://thumbnail.image.rakuten.co.jp/@0_mall/example/cabinet/cover.jpg'
const RAKUTEN_CREDENTIALS = {
  appId: 'app-id',
  accessKey: 'access-key',
  siteUrl: 'https://bookbook-worker.shohayakawa.workers.dev',
}

function bytes(length: number): Uint8Array {
  return new Uint8Array(length).fill(1)
}

function okImage() {
  return new Response(bytes(600), { status: 200, headers: { 'Content-Type': 'image/jpeg' } })
}

/** 既定で google/openbd/ndl は空応答。テストごとに必要な URL だけ上書きする */
function stubFetch(handlers: Record<string, () => Response>) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
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
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

beforeEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('fetchRakutenCoverSrc', () => {
  it('現行エンドポイントへapplicationIdとaccessKeyを送りlargeImageUrlを返す', async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        new Response(JSON.stringify({ Items: [{ Item: { largeImageUrl: RAKUTEN_COVER_SRC } }] }), {
          status: 200,
        }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchRakutenCoverSrc(ISBN, RAKUTEN_CREDENTIALS)).resolves.toBe(RAKUTEN_COVER_SRC)

    const [input, init] = fetchMock.mock.calls[0]
    const url = new URL(String(input))
    expect(url.origin).toBe('https://openapi.rakuten.co.jp')
    expect(url.searchParams.get('isbn')).toBe(ISBN)
    expect(url.searchParams.get('applicationId')).toBe(RAKUTEN_CREDENTIALS.appId)
    expect(url.searchParams.get('format')).toBe('json')
    const headers = new Headers(init?.headers)
    expect(headers.get('accessKey')).toBe(RAKUTEN_CREDENTIALS.accessKey)
    expect(headers.get('Referer')).toBe(`${RAKUTEN_CREDENTIALS.siteUrl}/`)
    expect(headers.get('Origin')).toBe(RAKUTEN_CREDENTIALS.siteUrl)
  })

  it('largeImageUrl が無ければ mediumImageUrl を返す', async () => {
    const mediumSrc = 'https://thumbnail.image.rakuten.co.jp/@0_mall/example/cabinet/medium.jpg'
    stubFetch({
      'openapi.rakuten.co.jp': () =>
        new Response(JSON.stringify({ Items: [{ Item: { mediumImageUrl: mediumSrc } }] }), {
          status: 200,
        }),
    })

    await expect(fetchRakutenCoverSrc(ISBN, RAKUTEN_CREDENTIALS)).resolves.toBe(mediumSrc)
  })

  it.each([401, 429, 500])('%i 応答なら undefined を返す', async (status) => {
    stubFetch({ 'openapi.rakuten.co.jp': () => new Response('', { status }) })

    await expect(fetchRakutenCoverSrc(ISBN, RAKUTEN_CREDENTIALS)).resolves.toBeUndefined()
  })

  it('商品が無ければ undefined を返す', async () => {
    stubFetch({
      'openapi.rakuten.co.jp': () => new Response(JSON.stringify({ Items: [] }), { status: 200 }),
    })

    await expect(fetchRakutenCoverSrc(ISBN, RAKUTEN_CREDENTIALS)).resolves.toBeUndefined()
  })

  it('例外（タイムアウト等）でも undefined を返す', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input).includes('openapi.rakuten.co.jp')) {
          throw new Error('timeout')
        }
        return new Response('', { status: 404 })
      }),
    )

    await expect(fetchRakutenCoverSrc(ISBN, RAKUTEN_CREDENTIALS)).resolves.toBeUndefined()
  })
})

describe('fetchExternalBookMetadata の楽天連携', () => {
  it('楽天認証情報指定時、楽天の表紙が候補として使われGET検証を経て採用される', async () => {
    stubFetch({
      'api.openbd.jp': () =>
        new Response(
          JSON.stringify([
            {
              onix: { DescriptiveDetail: {}, CollateralDetail: {} },
              summary: { title: '楽天カバー本' },
            },
          ]),
          { status: 200 },
        ),
      'openapi.rakuten.co.jp': () =>
        new Response(JSON.stringify({ Items: [{ Item: { largeImageUrl: RAKUTEN_COVER_SRC } }] }), {
          status: 200,
        }),
      [RAKUTEN_COVER_SRC]: okImage,
    })

    const result = await fetchExternalBookMetadata(ISBN, { rakuten: RAKUTEN_CREDENTIALS })
    expect(result?.title).toBe('楽天カバー本')
    expect(result?.cover.src).toBe(RAKUTEN_COVER_SRC)
  })

  it('楽天 API が 401 なら他候補（google）にフォールバックする', async () => {
    const googleSrc = 'https://books.google.com/books/content?id=xxx'
    stubFetch({
      'googleapis.com/books': () =>
        new Response(
          JSON.stringify({
            totalItems: 1,
            items: [
              { volumeInfo: { title: 'フォールバック本', imageLinks: { thumbnail: googleSrc } } },
            ],
          }),
          { status: 200 },
        ),
      'openapi.rakuten.co.jp': () => new Response('', { status: 401 }),
      [googleSrc]: okImage,
    })

    const result = await fetchExternalBookMetadata(ISBN, { rakuten: RAKUTEN_CREDENTIALS })
    expect(result?.cover.src).toBe(googleSrc)
  })

  it('楽天 API が例外でも他候補（google）にフォールバックする', async () => {
    const googleSrc = 'https://books.google.com/books/content?id=yyy'
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('openapi.rakuten.co.jp')) {
          throw new Error('timeout')
        }
        if (url.includes('googleapis.com/books')) {
          return new Response(
            JSON.stringify({
              totalItems: 1,
              items: [
                {
                  volumeInfo: { title: 'フォールバック本2', imageLinks: { thumbnail: googleSrc } },
                },
              ],
            }),
            { status: 200 },
          )
        }
        if (url === googleSrc) {
          return okImage()
        }
        if (url.includes('api.openbd.jp')) {
          return new Response(JSON.stringify([null]), { status: 200 })
        }
        return new Response('', { status: 404 })
      }),
    )

    const result = await fetchExternalBookMetadata(ISBN, { rakuten: RAKUTEN_CREDENTIALS })
    expect(result?.cover.src).toBe(googleSrc)
  })

  it('楽天認証情報が未指定なら楽天 API を呼ばない', async () => {
    const fetchMock = stubFetch({
      'api.openbd.jp': () =>
        new Response(
          JSON.stringify([
            {
              onix: { DescriptiveDetail: {}, CollateralDetail: {} },
              summary: { title: 'appIdなし本' },
            },
          ]),
          { status: 200 },
        ),
    })

    await fetchExternalBookMetadata(ISBN)

    const calledUrls = fetchMock.mock.calls.map(([input]) => String(input))
    expect(calledUrls.some((url) => url.includes('openapi.rakuten.co.jp'))).toBe(false)
  })

  it.each([
    { appId: 'app-id', accessKey: '', siteUrl: RAKUTEN_CREDENTIALS.siteUrl },
    { appId: '', accessKey: 'access-key', siteUrl: RAKUTEN_CREDENTIALS.siteUrl },
    { appId: 'app-id', accessKey: 'access-key', siteUrl: '' },
  ])('楽天認証情報が片方だけなら楽天 API を呼ばない', async (rakuten) => {
    const fetchMock = stubFetch({
      'api.openbd.jp': () =>
        new Response(
          JSON.stringify([
            {
              onix: { DescriptiveDetail: {}, CollateralDetail: {} },
              summary: { title: '認証情報不足' },
            },
          ]),
          { status: 200 },
        ),
    })

    await fetchExternalBookMetadata(ISBN, { rakuten })

    const calledUrls = fetchMock.mock.calls.map(([input]) => String(input))
    expect(calledUrls.some((url) => url.includes('openapi.rakuten.co.jp'))).toBe(false)
  })
})
