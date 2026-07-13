import { env } from 'cloudflare:test'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { signSession } from '../auth'
import app from '../index'
import { thumbnailKey } from '../thumbnails'

const ISBN = '9784873119038'

function bytes(length: number, fill = 1): Uint8Array {
  return new Uint8Array(length).fill(fill)
}

async function sessionCookie(email = 'user@example.com', name = 'Tester') {
  const token = await signSession(env.AUTH_COOKIE_SECRET, { email, name, hd: 'example.com' }, 3600)
  return `bookbook_session=${token}`
}

beforeEach(async () => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  const list = await env.THUMBNAILS.list()
  await Promise.all(list.objects.map((obj) => env.THUMBNAILS.delete(obj.key)))
})

describe('GET /api/thumbnails/:isbn', () => {
  it('セッション Cookie なしは 401', async () => {
    await env.THUMBNAILS.put(thumbnailKey(ISBN), bytes(600), {
      httpMetadata: { contentType: 'image/jpeg' },
    })

    const res = await app.fetch(new Request(`http://localhost/api/thumbnails/${ISBN}`), env)
    expect(res.status).toBe(401)
  })

  it('200: Content-Type / Cache-Control / ETag ヘッダとバイト内容を返す', async () => {
    const body = bytes(600)
    await env.THUMBNAILS.put(thumbnailKey(ISBN), body, {
      httpMetadata: { contentType: 'image/png' },
    })
    const cookie = await sessionCookie()

    const res = await app.fetch(
      new Request(`http://localhost/api/thumbnails/${ISBN}`, { headers: { Cookie: cookie } }),
      env,
    )

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('image/png')
    expect(res.headers.get('Cache-Control')).toBe('private, max-age=86400')
    expect(res.headers.get('ETag')).toBeTruthy()
    const received = new Uint8Array(await res.arrayBuffer())
    expect(received).toEqual(body)
  })

  it('If-None-Match が一致すれば 304', async () => {
    await env.THUMBNAILS.put(thumbnailKey(ISBN), bytes(600), {
      httpMetadata: { contentType: 'image/jpeg' },
    })
    const cookie = await sessionCookie()

    const first = await app.fetch(
      new Request(`http://localhost/api/thumbnails/${ISBN}`, { headers: { Cookie: cookie } }),
      env,
    )
    const etag = first.headers.get('ETag')
    expect(etag).toBeTruthy()

    const second = await app.fetch(
      new Request(`http://localhost/api/thumbnails/${ISBN}`, {
        headers: { Cookie: cookie, 'If-None-Match': etag as string },
      }),
      env,
    )

    expect(second.status).toBe(304)
    expect(second.headers.get('ETag')).toBe(etag)
    expect(second.headers.get('Cache-Control')).toBe('private, max-age=86400')
    expect(await second.arrayBuffer()).toEqual(new ArrayBuffer(0))
  })

  it('存在しない isbn は 404', async () => {
    const cookie = await sessionCookie()

    const res = await app.fetch(
      new Request('http://localhost/api/thumbnails/0000000000000', {
        headers: { Cookie: cookie },
      }),
      env,
    )

    expect(res.status).toBe(404)
  })
})
