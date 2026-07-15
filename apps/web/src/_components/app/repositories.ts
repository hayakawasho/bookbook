import { createFetchClient } from '../../_foundation/http/client'
import { HttpBookRepository } from '../../_repositories/books/httpRepository'
import { MockBookRepository } from '../../_repositories/books/repository'
import { HttpHistoryRepository } from '../../_repositories/history/httpRepository'
import { MockHistoryRepository } from '../../_repositories/history/repository'

import type { BookRepository } from '../../_usecases/book/ports'
import type { HistoryRepository } from '../../_usecases/history/ports'
import type { AppConfig } from './config'

export type Repositories = {
  bookRepo: BookRepository
  historyRepo: HistoryRepository
}

export function createRepositories(config: AppConfig): Repositories {
  if (config.profile === 'production') {
    const client = createFetchClient(config.apiBase)
    return {
      bookRepo: new HttpBookRepository(client),
      historyRepo: new HttpHistoryRepository(client),
    }
  }

  const bookRepo = new MockBookRepository()
  return {
    bookRepo,
    historyRepo: new MockHistoryRepository(bookRepo),
  }
}
