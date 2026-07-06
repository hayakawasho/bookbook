import type { SessionUser } from '../auth'

export type SlackNotificationType = 'checkout' | 'return' | 'new-book'

export type SlackBookInfo = { title: string; author?: string; isbn: string }

function checkoutBorrowerSlackLabel(user: SessionUser): string {
  const name = user.name?.trim()
  return name ? name : user.email
}

const ACTION_LABEL: Record<SlackNotificationType, string> = {
  checkout: '貸出',
  return: '返却',
  'new-book': '新規登録',
}

function buildSlackText(
  type: SlackNotificationType,
  location: string,
  book: SlackBookInfo,
  sessionUser?: SessionUser,
): string {
  let text = `[${location}] 📚 ${ACTION_LABEL[type] ?? type}: ${book.title}${book.author ? ` / ${book.author}` : ''}`
  if (type === 'checkout' && sessionUser) {
    text += ` · ${checkoutBorrowerSlackLabel(sessionUser)}`
  }
  return text
}

/** 失敗しても API 応答には影響させない best-effort 通知 */
export async function sendSlackNotification(
  webhookUrl: string | undefined,
  type: SlackNotificationType,
  location: string,
  book: SlackBookInfo,
  sessionUser?: SessionUser,
): Promise<void> {
  if (!webhookUrl) return

  try {
    const text = buildSlackText(type, location, book, sessionUser)
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    if (!res.ok) {
      console.error('Slack webhook failed', { status: res.status })
    }
  } catch (err) {
    console.error('Slack webhook error', err)
  }
}
