import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { stubAuthFetchAuthorized, stubAuthFetchUnauthorized } from './test/stubAuthFetch'

describe('App integration (VITE_USE_HTTP_API=true)', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('VITE_USE_HTTP_API', 'true')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('shows login when /auth/me is unauthorized', async () => {
    stubAuthFetchUnauthorized()
    const { App } = await import('./App')
    render(<App />)

    expect(
      await screen.findByRole('button', { name: /googleでログイン/i }),
    ).toBeInTheDocument()
  })

  it('shows main app when /auth/me succeeds', async () => {
    stubAuthFetchAuthorized()
    const { App } = await import('./App')
    render(<App />)

    expect(
      await screen.findByRole('heading', { name: /scan barcode/i }),
    ).toBeInTheDocument()
  })
})
