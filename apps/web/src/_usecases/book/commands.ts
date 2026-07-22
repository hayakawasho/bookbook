import { type UseCaseResult, useCaseResultError, useCaseResultOk } from '@bookbook/utils'

import { Book } from '../../_models/book'

import type { Location } from '../../_foundation/const'
import type { HistoryRepository } from '../history/ports'
import type { BookCacheMutator } from './cache'
import type { BookRepository, ExternalBookInfo } from './ports'

export type BookDeps = {
  bookRepo: BookRepository
  historyRepo: HistoryRepository
  mutator: BookCacheMutator
}

export async function addNewBook(
  deps: BookDeps,
  book: ExternalBookInfo,
  location: Location,
): Promise<UseCaseResult<Book, Error>> {
  try {
    await deps.bookRepo.createItem(book, location)
    const created = await deps.bookRepo.findByIsbn(book.isbn, location)

    if (created.status === 'registered') {
      await Promise.allSettled([
        deps.mutator.mutateItem(String(created.book.id), created, false),
        deps.mutator.mutateAllList(),
      ])

      return useCaseResultOk(created.book)
    }

    await Promise.allSettled([
      deps.mutator.mutateItem(book.isbn, undefined, true),
      deps.mutator.mutateAllList(),
    ])

    return useCaseResultError(new Error(`Book is not registered after create: ${book.isbn}`))
  } catch (e) {
    return useCaseResultError(e instanceof Error ? e : new Error(String(e)))
  }
}

export async function undoNewBook(
  deps: BookDeps,
  book: Book,
  location: Location,
): Promise<UseCaseResult<true, Error>> {
  try {
    const isbn = String(book.id)

    await deps.bookRepo.deleteItem(isbn, location)

    await Promise.allSettled([
      deps.mutator.mutateItem(isbn, undefined, true),
      deps.mutator.mutateAllList(),
    ])

    return useCaseResultOk(true)
  } catch (e) {
    return useCaseResultError(e instanceof Error ? e : new Error(String(e)))
  }
}

export async function checkoutBook(
  deps: BookDeps,
  book: Book,
  location: Location,
): Promise<UseCaseResult<true, Error>> {
  try {
    const isbn = String(book.id)

    await deps.historyRepo.createItem(isbn, location)

    // 並行操作で在庫がずれるためローカル計算せず再検証する。同期失敗は業務結果に影響させない
    await Promise.allSettled([deps.mutator.mutateManyHistory(), deps.mutator.revalidateBook(isbn)])

    return useCaseResultOk(true)
  } catch (e) {
    return useCaseResultError(e instanceof Error ? e : new Error(String(e)))
  }
}

export async function restockBook(
  deps: BookDeps,
  book: Book,
  location: Location,
): Promise<UseCaseResult<true, Error>> {
  try {
    const updated = await deps.bookRepo.addCopy(String(book.id), location)

    await Promise.allSettled([
      deps.mutator.mutateItem(String(book.id), { status: 'registered', book: updated }, false),
      deps.mutator.mutateListItem(String(book.id), updated),
      // 通常履歴のスナップショットにも total/availableCount が含まれるため両方再検証する
      deps.mutator.mutateManyHistory(),
    ])

    return useCaseResultOk(true)
  } catch (e) {
    return useCaseResultError(e instanceof Error ? e : new Error(String(e)))
  }
}

export async function returnBook(
  deps: BookDeps,
  historyId: string,
  book: Book,
  location: Location,
): Promise<UseCaseResult<true, Error>> {
  try {
    const isbn = String(book.id)

    await deps.historyRepo.returnItem(historyId, location)

    await Promise.allSettled([deps.mutator.mutateManyHistory(), deps.mutator.revalidateBook(isbn)])

    return useCaseResultOk(true)
  } catch (e) {
    return useCaseResultError(e instanceof Error ? e : new Error(String(e)))
  }
}

export async function uploadBookCover(
  deps: BookDeps,
  book: Book,
  image: Blob,
): Promise<UseCaseResult<Book, Error>> {
  try {
    const isbn = String(book.id)
    const { src } = await deps.bookRepo.uploadCoverImage(isbn, image)
    const updated = Book.create({ ...book, cover: { src } })

    // book は取得時点のスナップショットで在庫が古い可能性があるため、確定書き込みせず再検証する
    await Promise.allSettled([deps.mutator.revalidateBook(isbn)])

    return useCaseResultOk(updated)
  } catch (e) {
    return useCaseResultError(e instanceof Error ? e : new Error(String(e)))
  }
}

export async function undoReturnBook(
  deps: BookDeps,
  historyId: string,
  book: Book,
  location: Location,
): Promise<UseCaseResult<true, Error>> {
  try {
    const isbn = String(book.id)

    await deps.historyRepo.undoReturnItem(historyId, location)

    await Promise.allSettled([deps.mutator.mutateManyHistory(), deps.mutator.revalidateBook(isbn)])

    return useCaseResultOk(true)
  } catch (e) {
    return useCaseResultError(e instanceof Error ? e : new Error(String(e)))
  }
}
