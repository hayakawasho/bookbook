export type HttpClient = {
  request(path: string, init?: RequestInit): Promise<Response>
}

export function createFetchClient(baseUrl: string): HttpClient {
  return {
    request(path, init) {
      return fetch(`${baseUrl}${path}`, { credentials: 'include', ...init })
    },
  }
}
