import { HttpBookRepository } from '../../_repositories/books/httpRepository'
import { MockBookRepository } from '../../_repositories/books/repository'
import { HttpHistoryRepository } from '../../_repositories/history/httpRepository'
import { MockHistoryRepository } from '../../_repositories/history/repository'

import type { BookRepository } from '../../_usecases/book/ports'
import type { HistoryRepository } from '../../_usecases/history/ports'

const USE_HTTP_API = import.meta.env.VITE_USE_HTTP_API === 'true'
const API_BASE = '/api'

export const bookRepo: BookRepository = USE_HTTP_API
  ? new HttpBookRepository(API_BASE)
  : new MockBookRepository()

export const historyRepo: HistoryRepository = USE_HTTP_API
  ? new HttpHistoryRepository(API_BASE)
  : new MockHistoryRepository(bookRepo)
