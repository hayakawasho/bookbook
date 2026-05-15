import type { BookMetadata } from '../_book/model'
import type { Location } from './const'
import type { NotificationGateway, NotificationType } from './notificationGateway'

export class HttpNotificationGateway implements NotificationGateway {
  constructor(private readonly baseUrl: string) {}

  async notify(type: NotificationType, location: Location, book: BookMetadata): Promise<void> {
    const res = await fetch(`${this.baseUrl}/notifications/slack`, {
      credentials: 'include',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, location, book }),
    })
    if (!res.ok) throw new Error(`POST /notifications/slack failed: ${res.status}`)
  }
}
