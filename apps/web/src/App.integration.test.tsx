import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { App } from './App'

describe('App integration (VITE_USE_HTTP_API=false / mock session)', () => {
  it('shows home scan UI by default', async () => {
    render(<App />)
    expect(
      await screen.findByRole('heading', { name: /scan barcode/i }),
    ).toBeInTheDocument()
  })

  it('switches to library tab', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByRole('heading', { name: /scan barcode/i })

    const nav = screen.getByRole('navigation', { name: 'タブナビゲーション' })
    await user.click(within(nav).getByText('本棚'))

    expect(await screen.findByLabelText('本棚を検索')).toBeInTheDocument()
  })

  it('switches to checkout history tab', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByRole('heading', { name: /scan barcode/i })

    const nav = screen.getByRole('navigation', { name: 'タブナビゲーション' })
    await user.click(within(nav).getByText('貸出履歴'))

    const banner = await screen.findByRole('banner')
    expect(within(banner).getByText('貸出履歴')).toBeInTheDocument()
    expect(screen.getByText('借りている本')).toBeInTheDocument()
  })
})
