import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import { App } from './_components/app/App'
import { createTestDeps } from './test/testDeps'

describe('App', () => {
  describe('モックセッション', () => {
    async function searchByIsbn(isbn: string) {
      const user = userEvent.setup()
      const input = await screen.findByPlaceholderText(/ISBNを入力/)
      await user.type(input, isbn)
      await user.click(screen.getByRole('button', { name: '検索' }))
    }

    it('起動時にホームのスキャン UI が表示される', async () => {
      render(
        <MemoryRouter>
          <App {...createTestDeps()} />
        </MemoryRouter>,
      )
      expect(await screen.findByRole('heading', { name: /scan barcode/i })).toBeInTheDocument()
    })

    it('本棚タブに切り替えられる', async () => {
      const user = userEvent.setup()
      render(
        <MemoryRouter>
          <App {...createTestDeps()} />
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
          <App {...createTestDeps()} />
        </MemoryRouter>,
      )
      await screen.findByRole('heading', { name: /scan barcode/i })

      const nav = screen.getByRole('navigation', { name: 'タブナビゲーション' })
      await user.click(within(nav).getByText('貸出履歴'))

      const banner = await screen.findByRole('banner')
      expect(within(banner).getByText('貸出履歴')).toBeInTheDocument()
      expect(screen.getByText('借りている本')).toBeInTheDocument()
    })

    it('本棚の検索クエリを自由入力できる', async () => {
      const user = userEvent.setup()
      render(
        <MemoryRouter initialEntries={['/library']}>
          <App {...createTestDeps()} />
        </MemoryRouter>,
      )

      const input = await screen.findByLabelText('本棚を検索')
      await user.type(input, 'リーダブル')

      expect(input).toHaveValue('リーダブル')
      expect(await screen.findByText('リーダブルコード')).toBeInTheDocument()
      expect(screen.queryByText('テスト駆動開発')).not.toBeInTheDocument()
    })

    it('本棚の検索クエリを URL から復元しない', async () => {
      render(
        <MemoryRouter initialEntries={['/library?q=リーダブル']}>
          <App {...createTestDeps()} />
        </MemoryRouter>,
      )

      expect(await screen.findByLabelText('本棚を検索')).toHaveValue('')
      expect(await screen.findByText('リーダブルコード')).toBeInTheDocument()
      expect(screen.getByText('テスト駆動開発')).toBeInTheDocument()
    })

    it('/history?tab=past の直リンクで「これまで借りた本」が表示される', async () => {
      render(
        <MemoryRouter initialEntries={['/history?tab=past']}>
          <App {...createTestDeps()} />
        </MemoryRouter>,
      )

      expect(await screen.findByText('社内の本を借りてみよう！')).toBeInTheDocument()
    })

    it('設定を開いて戻ると元のタブに戻る', async () => {
      const user = userEvent.setup()
      render(
        <MemoryRouter>
          <App {...createTestDeps()} />
        </MemoryRouter>,
      )
      await screen.findByRole('heading', { name: /scan barcode/i })

      const nav = screen.getByRole('navigation', { name: 'タブナビゲーション' })
      await user.click(within(nav).getByText('貸出履歴'))
      await user.click(await screen.findByRole('button', { name: '設定' }))
      await user.click(await screen.findByRole('button', { name: '戻る' }))

      const banner = await screen.findByRole('banner')
      expect(within(banner).getByText('貸出履歴')).toBeInTheDocument()
    })

    it('不正な ISBN の検索時にエラートーストを表示する', async () => {
      render(
        <MemoryRouter>
          <App {...createTestDeps()} />
        </MemoryRouter>,
      )

      await searchByIsbn('invalid')

      expect(await screen.findByRole('status')).toHaveTextContent(
        'バーコードを読み取れませんでした。もう一度かざしてください',
      )
    })

    it('書籍が見つからないときにエラートーストを表示する', async () => {
      render(
        <MemoryRouter>
          <App {...createTestDeps()} />
        </MemoryRouter>,
      )

      await searchByIsbn('9784873119991')

      expect(await screen.findByRole('status')).toHaveTextContent('本の情報が見つかりませんでした')
    })

    it('書籍検索が失敗したときにエラートーストを表示する', async () => {
      const deps = createTestDeps()
      deps.repositories.bookRepo.findByIsbn = () => Promise.reject(new Error('network error'))

      render(
        <MemoryRouter>
          <App {...deps} />
        </MemoryRouter>,
      )

      await searchByIsbn('9784873119038')

      expect(await screen.findByRole('status')).toHaveTextContent(
        '本の情報を確認できませんでした。時間を置いて、もう一度お試しください',
      )
    })

    it('書籍検索中は別のISBNの検索を重ねて開始しない', async () => {
      const deps = createTestDeps()
      deps.repositories.bookRepo.findByIsbn = vi.fn(() => new Promise(() => {}))
      const user = userEvent.setup()

      render(
        <MemoryRouter>
          <App {...deps} />
        </MemoryRouter>,
      )

      const input = await screen.findByPlaceholderText(/ISBNを入力/)
      await user.type(input, '9791234567896')
      const button = screen.getByRole('button', { name: '検索' })
      await user.click(button)
      await user.clear(input)
      await user.type(input, '9790000000001')
      await user.click(button)

      expect(vi.mocked(deps.repositories.bookRepo.findByIsbn).mock.calls).toEqual([
        ['9791234567896', 'daikanyama'],
      ])
    })
  })
})
