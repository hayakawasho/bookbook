import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { App } from './_components/app/App'
import { createTestDeps } from './test/testDeps'

vi.mock('./_foundation/coverImageResize', () => ({
  resizeCoverImage: vi.fn((file: Blob) => Promise.resolve(file)),
}))

// coverImageResize は canvas 前提のため jsdom では通さない（上でパススルーに差し替え済み）
const NO_COVER_ISBN = '9784295012641'
const NO_COVER_TITLE = 'チームトポロジー'
const HAS_COVER_ISBN = '9784798163215'

async function searchByIsbn(user: ReturnType<typeof userEvent.setup>, isbn: string) {
  const input = screen.getByPlaceholderText(/ISBNを入力/)
  await user.clear(input)
  await user.type(input, isbn)
  await user.click(screen.getByRole('button', { name: '検索' }))
}

describe('Home 表紙を撮影', () => {
  beforeEach(() => {
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:mock-preview'),
      revokeObjectURL: vi.fn(),
    })
  })

  it('cover なしの外部書誌は撮影ボタンから登録し、アップロードまで到達する', async () => {
    const user = userEvent.setup()
    const deps = createTestDeps()
    const uploadSpy = vi.spyOn(deps.repositories.bookRepo, 'uploadCoverImage')

    render(
      <MemoryRouter>
        <App {...deps} />
      </MemoryRouter>,
    )
    await screen.findByRole('heading', { name: /scan barcode/i })

    await searchByIsbn(user, NO_COVER_ISBN)

    const fileInput = await screen.findByLabelText('表紙を撮影')
    const file = new File(['cover-bytes'], 'cover.jpg', { type: 'image/jpeg' })
    await user.upload(fileInput, file)

    await waitFor(() => {
      expect(screen.getByAltText(NO_COVER_TITLE)).toHaveAttribute('src', 'blob:mock-preview')
    })

    await user.click(screen.getByRole('button', { name: '新規追加' }))

    await waitFor(() => {
      expect(uploadSpy).toHaveBeenCalledWith(NO_COVER_ISBN, expect.any(File))
    })

    const toast = await screen.findByRole('status')
    expect(toast).toHaveTextContent('本棚に追加しました')
    expect(toast).not.toHaveTextContent('失敗')
  })

  it('cover ありの外部書誌では撮影ボタンが表示されない', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <App {...createTestDeps()} />
      </MemoryRouter>,
    )
    await screen.findByRole('heading', { name: /scan barcode/i })

    await searchByIsbn(user, HAS_COVER_ISBN)

    await screen.findByRole('button', { name: '新規追加' })
    expect(screen.queryByLabelText('表紙を撮影')).not.toBeInTheDocument()
  })
})
