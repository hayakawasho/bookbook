import { createContext, useContext } from 'react'

import type { Location } from '../_foundation/const'
import type { NotificationGateway } from '../_foundation/notificationGateway'
import type { BookRepository } from './book/ports'
import type { HistoryRepository } from './history/ports'

export type UsecaseDeps = {
  bookRepo: BookRepository
  historyRepo: HistoryRepository
  notify: NotificationGateway
  location: Location
}

const UsecaseDepsContext = createContext<UsecaseDeps | null>(null)

export const UsecaseDepsProvider = UsecaseDepsContext.Provider

export function useUsecaseDeps(): UsecaseDeps {
  const ctx = useContext(UsecaseDepsContext)

  if (!ctx) {
    throw new Error('useUsecaseDeps must be used within UsecaseDepsProvider')
  }
  return ctx
}
