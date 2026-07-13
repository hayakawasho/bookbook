import { vi } from 'vitest'

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.href
  return input.url
}

/** `/api/auth/me` のみモックし、その他の fetch は失敗させる（テストの漏れを検知しやすくする） */
export function stubAuthFetchUnauthorized(): void {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      const url = requestUrl(input)
      if (url.includes('/auth/me')) {
        return Promise.resolve({
          ok: false,
          status: 401,
        } as Response)
      }
      return Promise.reject(new Error(`unexpected fetch in test: ${url}`))
    }),
  )
}

export function stubAuthFetchAuthorized(email = 'test@example.com'): void {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      const url = requestUrl(input)
      if (url.includes('/auth/me')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            user: { email, name: 'Test User' },
          }),
        } as Response)
      }
      if (url.includes('/auth/logout')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ ok: true }),
        } as Response)
      }
      return Promise.reject(new Error(`unexpected fetch in test: ${url}`))
    }),
  )
}
