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
      await Promise.all([
        deps.mutator.mutateItem(String(created.book.id), created, false),
        deps.mutator.mutateAllList(),
      ])

      return useCaseResultOk(created.book)
    }

    await Promise.all([
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

    await Promise.all([
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
    const updated = Book.checkout(book)
    const isbn = String(book.id)

    await deps.historyRepo.createItem(isbn, location)

    // createItem 成功後は貸出履歴キャッシュを必ず再検証（findByIsbn が未登録でも stale にしない）
    await deps.mutator.mutateManyHistory()

    await Promise.all([
      deps.mutator.mutateItem(isbn, { status: 'registered', book: updated }, false),
      deps.mutator.mutateListItem(isbn, updated),
    ])

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

    await Promise.all([
      deps.mutator.mutateItem(String(book.id), { status: 'registered', book: updated }, false),
      deps.mutator.mutateListItem(String(book.id), updated),
      deps.mutator.mutateBorrowingItems(),
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
    const updated = Book.return(book)
    const isbn = String(book.id)

    await deps.historyRepo.returnItem(historyId, location)

    await deps.mutator.mutateManyHistory()

    await Promise.all([
      deps.mutator.mutateItem(isbn, { status: 'registered', book: updated }, false),
      deps.mutator.mutateListItem(isbn, updated),
    ])

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

    await Promise.all([
      deps.mutator.mutateItem(isbn, { status: 'registered', book: updated }, false),
      deps.mutator.mutateListItem(isbn, updated),
    ])

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
    // 返却取り消し = 再び貸出中に戻るため、在庫は checkout と同じ方向に動く
    const updated = Book.checkout(book)
    const isbn = String(book.id)

    await deps.historyRepo.undoReturnItem(historyId, location)

    await deps.mutator.mutateManyHistory()

    await Promise.all([
      deps.mutator.mutateItem(isbn, { status: 'registered', book: updated }, false),
      deps.mutator.mutateListItem(isbn, updated),
    ])

    return useCaseResultOk(true)
  } catch (e) {
    return useCaseResultError(e instanceof Error ? e : new Error(String(e)))
  }
}
