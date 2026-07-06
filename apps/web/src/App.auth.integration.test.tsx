import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { stubAuthFetchAuthorized, stubAuthFetchUnauthorized } from './test/stubAuthFetch'

describe('App', () => {
  describe('HTTP API', () => {
    beforeEach(() => {
      vi.resetModules()
      vi.stubEnv('VITE_USE_HTTP_API', 'true')
    })

    afterEach(() => {
      vi.unstubAllGlobals()
      vi.unstubAllEnvs()
    })

    it('/auth/me が未認証のときログイン画面を表示する', async () => {
      stubAuthFetchUnauthorized()
      const { App } = await import('./_components/app/App')
      render(<App />)

      expect(await screen.findByRole('button', { name: /googleでログイン/i })).toBeInTheDocument()
    })

    it('/auth/me が成功したときメインアプリを表示する', async () => {
      stubAuthFetchAuthorized()
      const { App } = await import('./_components/app/App')
      render(<App />)

      expect(await screen.findByRole('heading', { name: /scan barcode/i })).toBeInTheDocument()
    })
  })
})
