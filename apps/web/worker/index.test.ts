import { beforeEach, describe, expect, it, vi } from 'vitest'
import app from './index'

const TEST_ENV = {
  MICROCMS_DAIKANYAMA_API_KEY: 'test-key',
  MICROCMS_DAIKANYAMA_BASE_URL: 'https://microcms.test',
  MICROCMS_OKINAWA_API_KEY: '',
  MICROCMS_OKINAWA_BASE_URL: '',
  SLACK_WEBHOOK_URL: '',
}

function postBooks(body: object) {
  return new Request('http://localhost/api/books', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/books', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('cover あり: microCMS に fieldId 付きの cover_metadata を送り 201 を返す', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('{"id":"1234567890123"}', { status: 201 })),
    )

    const res = await app.fetch(
      postBooks({
        isbn: '1234567890123',
        title: 'テスト本',
        cover: { src: 'https://example.com/cover.jpg' },
        location: 'daikanyama',
      }),
      TEST_ENV,
    )

    expect(res.status).toBe(201)

    const mockFetch = vi.mocked(globalThis.fetch)
    const [, init] = mockFetch.mock.calls[0]
    const sentBody = JSON.parse((init as RequestInit).body as string)
    expect(sentBody.cover_metadata).toEqual({ fieldId: 'img_metadata', src: 'https://example.com/cover.jpg' })
    expect(sentBody.id).toBe('1234567890123')
    expect(sentBody.available_count).toBe(1)
    expect(sentBody.total).toBe(1)
  })

  it('cover なし: payload に cover_metadata が含まれない', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('{}', { status: 201 })),
    )

    const res = await app.fetch(
      postBooks({
        isbn: '1234567890124',
        title: 'カバーなし本',
        cover: {},
        location: 'daikanyama',
      }),
      TEST_ENV,
    )

    expect(res.status).toBe(201)

    const mockFetch = vi.mocked(globalThis.fetch)
    const [, init] = mockFetch.mock.calls[0]
    const sentBody = JSON.parse((init as RequestInit).body as string)
    expect(sentBody).not.toHaveProperty('cover_metadata')
  })

  it('未対応 location: 503 と credentials エラーを返す', async () => {
    const res = await app.fetch(
      postBooks({
        isbn: '1234567890125',
        title: 'テスト本',
        cover: {},
        location: 'unknown-location',
      }),
      TEST_ENV,
    )

    expect(res.status).toBe(503)
    const body = (await res.json()) as Record<string, unknown>
    expect(body.error).toMatch(/credentials are not configured/)
  })

  it('author/publisher/description が空文字または未指定のとき: payload から省略される', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('{}', { status: 201 })),
    )

    const res = await app.fetch(
      postBooks({
        isbn: '1234567890127',
        title: 'フィールドなし本',
        author: '',
        publisher: '',
        description: '',
        cover: {},
        location: 'daikanyama',
      }),
      TEST_ENV,
    )

    expect(res.status).toBe(201)
    const mockFetch = vi.mocked(globalThis.fetch)
    const [, init] = mockFetch.mock.calls[0]
    const sentBody = JSON.parse((init as RequestInit).body as string)
    expect(sentBody).not.toHaveProperty('author')
    expect(sentBody).not.toHaveProperty('publisher')
    expect(sentBody).not.toHaveProperty('description')
  })

  it('microCMS が 400 を返したとき: 502 + upstreamStatus + upstreamBody を含む', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('INVALID_FIELD', { status: 400 })),
    )

    const res = await app.fetch(
      postBooks({
        isbn: '1234567890126',
        title: 'テスト本',
        cover: {},
        location: 'daikanyama',
      }),
      TEST_ENV,
    )

    expect(res.status).toBe(502)
    const body = (await res.json()) as Record<string, unknown>
    expect(body.upstreamStatus).toBe(400)
    expect(body.upstreamBody).toBe('INVALID_FIELD')
  })
})
