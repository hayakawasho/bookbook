import type { Book } from '../_models/book'
import type { Location } from './const'

export type NotificationType = 'checkout' | 'return' | 'new-book'

/** 通知送信（mock / HTTP 実装を差し替え可能） */
export interface NotificationGateway {
  notify(type: NotificationType, location: Location, book: Book): Promise<void>
}

export class MockNotificationGateway implements NotificationGateway {
  notify(_type: NotificationType, _location: Location, _book: Book): Promise<void> {
    return Promise.resolve()
  }
}
