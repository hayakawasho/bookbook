import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

    it('設定画面のログアウトからログイン画面に戻る', async () => {
      stubAuthFetchAuthorized()
      const user = userEvent.setup()
      const { App } = await import('./_components/app/App')
      render(<App />)

      await screen.findByRole('heading', { name: /scan barcode/i })
      const nav = screen.getByRole('navigation', { name: 'タブナビゲーション' })
      await user.click(within(nav).getByText('貸出履歴'))
      await user.click(await screen.findByRole('button', { name: '設定' }))

      expect(await screen.findByText('Test User')).toBeInTheDocument()
      expect(screen.getByText('test@example.com')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'ログアウト' }))
      const dialog = await screen.findByRole('alertdialog')
      await user.click(within(dialog).getByRole('button', { name: 'ログアウト' }))

      expect(await screen.findByRole('button', { name: /googleでログイン/i })).toBeInTheDocument()
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/logout'),
        expect.objectContaining({ method: 'POST' }),
      )
    })
  })
})
