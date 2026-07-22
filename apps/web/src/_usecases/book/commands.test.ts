import { describe, expect, it, vi } from 'vitest'

import { Book, toBookId } from '../../_models/book'

import { checkoutBook, returnBook, undoReturnBook } from './commands'

import type { BookDeps } from './commands'

function createDeps(): BookDeps {
  return {
    bookRepo: {
      findByIsbn: vi.fn(),
      findMany: vi.fn(),
      createItem: vi.fn(),
      addCopy: vi.fn(),
      deleteItem: vi.fn(),
      uploadCoverImage: vi.fn(),
    },
    historyRepo: {
      findMany: vi.fn(),
      createItem: vi.fn().mockResolvedValue(undefined),
      returnItem: vi.fn().mockResolvedValue(undefined),
      undoReturnItem: vi.fn().mockResolvedValue(undefined),
    },
    mutator: {
      mutateItem: vi.fn().mockResolvedValue(undefined),
      mutateListItem: vi.fn().mockResolvedValue(undefined),
      mutateAllList: vi.fn().mockResolvedValue(undefined),
      mutateManyHistory: vi.fn().mockResolvedValue(undefined),
      revalidateBook: vi.fn().mockResolvedValue(undefined),
    },
  } as unknown as BookDeps
}

function createBook(availableCount: number, total: number): Book {
  return Book.create({
    id: toBookId('9784000000000'),
    title: 'テスト本',
    cover: {},
    availableCount,
    total,
  })
}

describe('checkoutBook', () => {
  it('貸出成功後は在庫をローカル計算せず履歴と書籍を再検証する', async () => {
    const deps = createDeps()

    const result = await checkoutBook(deps, createBook(2, 2), 'daikanyama')

    expect(result.err).toBeNull()
    expect(deps.mutator.mutateManyHistory).toHaveBeenCalled()
    expect(deps.mutator.revalidateBook).toHaveBeenCalledWith('9784000000000')
    expect(deps.mutator.mutateItem).not.toHaveBeenCalled()
    expect(deps.mutator.mutateListItem).not.toHaveBeenCalled()
  })

  it('API成功後のキャッシュ再検証が失敗しても業務結果は成功', async () => {
    const deps = createDeps()
    vi.mocked(deps.mutator.revalidateBook).mockRejectedValue(new Error('network'))

    const result = await checkoutBook(deps, createBook(2, 2), 'daikanyama')

    expect(result.err).toBeNull()
  })

  it('API失敗時はエラーを返す', async () => {
    const deps = createDeps()
    vi.mocked(deps.historyRepo.createItem).mockRejectedValue(new Error('409'))

    const result = await checkoutBook(deps, createBook(2, 2), 'daikanyama')

    expect(result.err).toBeInstanceOf(Error)
    expect(deps.mutator.revalidateBook).not.toHaveBeenCalled()
  })
})

describe('returnBook', () => {
  it('返却成功後は履歴と書籍を再検証する', async () => {
    const deps = createDeps()

    const result = await returnBook(deps, '1', createBook(0, 1), 'daikanyama')

    expect(result.err).toBeNull()
    expect(deps.historyRepo.returnItem).toHaveBeenCalledWith('1', 'daikanyama')
    expect(deps.mutator.mutateManyHistory).toHaveBeenCalled()
    expect(deps.mutator.revalidateBook).toHaveBeenCalledWith('9784000000000')
  })

  it('API成功後のキャッシュ再検証が失敗しても業務結果は成功', async () => {
    const deps = createDeps()
    vi.mocked(deps.mutator.mutateManyHistory).mockRejectedValue(new Error('network'))

    const result = await returnBook(deps, '1', createBook(0, 1), 'daikanyama')

    expect(result.err).toBeNull()
  })
})

describe('undoReturnBook', () => {
  it('在庫0のスナップショットでも取り消しできる', async () => {
    const deps = createDeps()

    const result = await undoReturnBook(deps, '1', createBook(0, 1), 'daikanyama')

    expect(result.err).toBeNull()
    expect(deps.historyRepo.undoReturnItem).toHaveBeenCalledWith('1', 'daikanyama')
  })

  it('取り消し成功後は履歴と書籍を再検証する', async () => {
    const deps = createDeps()

    await undoReturnBook(deps, '1', createBook(1, 2), 'daikanyama')

    expect(deps.mutator.mutateManyHistory).toHaveBeenCalled()
    expect(deps.mutator.revalidateBook).toHaveBeenCalledWith('9784000000000')
  })
})
