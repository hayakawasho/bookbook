import { HttpNotificationGateway } from '../../_foundation/httpNotificationGateway'
import { MockNotificationGateway } from '../../_foundation/notificationGateway'
import { HttpBookRepository } from '../../_repositories/books/httpRepository'
import { MockBookRepository } from '../../_repositories/books/repository'
import { HttpHistoryRepository } from '../../_repositories/history/httpRepository'
import { MockHistoryRepository } from '../../_repositories/history/repository'

import type { NotificationGateway } from '../../_foundation/notificationGateway'
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

export const notificationGateway: NotificationGateway = USE_HTTP_API
  ? new HttpNotificationGateway(API_BASE)
  : new MockNotificationGateway()
