/**
 * bookbook — 最小 Service Worker
 * - /api/* には触れない（キャッシュもフォールバックもしない）
 * - ナビゲーションは network-first、オフライン時はキャッシュしたシェルのみ返す
 * - 同一オリジンの GET 静的リソースは stale-while-revalidate（初回訪問後のオフライン用）
 */
const SHELL_CACHE = 'bookbook-shell-v1'
const STATIC_CACHE = 'bookbook-static-v1'

/** インストール時に先読みする（失敗しても無視） */
const SHELL_URLS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(async (cache) => {
      await Promise.all(
        SHELL_URLS.map(async (url) => {
          try {
            await cache.add(new Request(url, { cache: 'reload' }))
          } catch {
            /* リダイレクトや一時エラーは許容 */
          }
        }),
      )
    }),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== SHELL_CACHE && key !== STATIC_CACHE) {
            return caches.delete(key)
          }
          return undefined
        }),
      ),
    ),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') {
    return
  }

  const url = new URL(req.url)
  if (url.origin !== self.location.origin) {
    return
  }

  if (url.pathname.startsWith('/api')) {
    return
  }

  if (url.pathname === '/sw.js') {
    return
  }

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(async () => {
        const shell = await caches.match('/')
        if (shell) return shell
        const html = await caches.match('/index.html')
        return html ?? Response.error()
      }),
    )
    return
  }

  event.respondWith(
    caches.open(STATIC_CACHE).then(async (cache) => {
      const cached = await cache.match(req)

      const networkPromise = fetch(req)
        .then((res) => {
          if (res.ok) {
            cache.put(req, res.clone())
          }
          return res
        })
        .catch(() => undefined)

      if (cached) {
        event.waitUntil(networkPromise)
        return cached
      }

      const res = await networkPromise
      return res ?? Response.error()
    }),
  )
})
