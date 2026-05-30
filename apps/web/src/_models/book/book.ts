import { defineEntity } from '../defineEntity'
import type { EntityWithId } from '../types'
import { toBookId } from './ids'

type BookPayload = {
  title: string
  author?: string
  publisher?: string
  publishedDate?: Date
  cover: { src?: string }
  description?: string
  availableCount: number
  total: number
}

type StockFields = Pick<BookPayload, 'availableCount' | 'total'>

export type Book = EntityWithId<BookPayload, 'book'>

const factory = defineEntity(toBookId)<BookPayload>()

function checkoutStock(stock: StockFields): StockFields {
  if (stock.availableCount <= 0) {
    throw new Error('在庫がありません')
  }

  return { ...stock, availableCount: stock.availableCount - 1 }
}

function returnStock(stock: StockFields): StockFields {
  const isFullyAvailable = stock.availableCount >= stock.total

  if (isFullyAvailable) {
    throw new Error('全冊が在庫済みです')
  }

  return { ...stock, availableCount: stock.availableCount + 1 }
}

function addStockCopy(stock: StockFields): StockFields {
  return { total: stock.total + 1, availableCount: stock.availableCount + 1 }
}

export const Book = {
  create: factory.create,
  isBorrowable: (b: Book): boolean => {
    return b.availableCount > 0
  },
  checkout: (b: Book): Book => {
    return Book.create({ ...b, ...checkoutStock(b) })
  },
  return: (b: Book): Book => {
    return Book.create({ ...b, ...returnStock(b) })
  },
  addStock: (b: Book): Book => {
    return Book.create({ ...b, ...addStockCopy(b) })
  },
}
