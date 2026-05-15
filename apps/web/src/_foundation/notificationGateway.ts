import type { BookMetadata } from '../_book/model'
import type { Location } from './const'

export type NotificationType = 'checkout' | 'return' | 'new-book'

/** 通知送信（Slack 等への実装は Phase 4） */
export interface NotificationGateway {
  notify(type: NotificationType, location: Location, book: BookMetadata): void
}

export class MockNotificationGateway implements NotificationGateway {
  notify(_type: NotificationType, _location: Location, _book: BookMetadata): void {
    // Phase 4 で Slack webhook 実装に差し替える
  }
}
