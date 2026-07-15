import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'

import { App } from './_components/app/App'

describe('App', () => {
  describe('モックセッション', () => {
    it('起動時にホームのスキャン UI が表示される', async () => {
      render(
        <MemoryRouter>
          <App />
        </MemoryRouter>,
      )
      expect(await screen.findByRole('heading', { name: /scan barcode/i })).toBeInTheDocument()
    })

    it('本棚タブに切り替えられる', async () => {
      const user = userEvent.setup()
      render(
        <MemoryRouter>
          <App />
        </MemoryRouter>,
      )
      await screen.findByRole('heading', { name: /scan barcode/i })

      const nav = screen.getByRole('navigation', { name: 'タブナビゲーション' })
      await user.click(within(nav).getByText('本棚'))

      expect(await screen.findByLabelText('本棚を検索')).toBeInTheDocument()
    })

    it('貸出履歴タブに切り替えられる', async () => {
      const user = userEvent.setup()
      render(
        <MemoryRouter>
          <App />
        </MemoryRouter>,
      )
      await screen.findByRole('heading', { name: /scan barcode/i })

      const nav = screen.getByRole('navigation', { name: 'タブナビゲーション' })
      await user.click(within(nav).getByText('貸出履歴'))

      const banner = await screen.findByRole('banner')
      expect(within(banner).getByText('貸出履歴')).toBeInTheDocument()
      expect(screen.getByText('借りている本')).toBeInTheDocument()
    })
  })
})
