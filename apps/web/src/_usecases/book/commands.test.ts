import { describe, expect, it, vi } from 'vitest'

import { Book, toBookId } from '../../_models/book'

import { undoReturnBook } from './commands'

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
      createItem: vi.fn(),
      returnItem: vi.fn().mockResolvedValue(undefined),
      undoReturnItem: vi.fn().mockResolvedValue(undefined),
    },
    mutator: {
      mutateItem: vi.fn().mockResolvedValue(undefined),
      mutateListItem: vi.fn().mockResolvedValue(undefined),
      mutateAllList: vi.fn().mockResolvedValue(undefined),
      mutateManyHistory: vi.fn().mockResolvedValue(undefined),
    },
  } as unknown as BookDeps
}

describe('undoReturnBook', () => {
  it('借出時点のスナップショットが在庫0でも取り消しできる', async () => {
    const deps = createDeps()
    const book = Book.create({
      id: toBookId('9784000000000'),
      title: 'テスト本',
      cover: {},
      availableCount: 0,
      total: 1,
    })

    const result = await undoReturnBook(deps, '1', book, 'daikanyama')

    expect(result.err).toBeNull()
    expect(deps.historyRepo.undoReturnItem).toHaveBeenCalledWith('1', 'daikanyama')
  })

  it('取り消し後のキャッシュはスナップショットの在庫のまま更新する', async () => {
    const deps = createDeps()
    const book = Book.create({
      id: toBookId('9784000000000'),
      title: 'テスト本',
      cover: {},
      availableCount: 1,
      total: 2,
    })

    await undoReturnBook(deps, '1', book, 'daikanyama')

    expect(deps.mutator.mutateItem).toHaveBeenCalledWith(
      '9784000000000',
      { status: 'registered', book },
      false,
    )
  })
})
