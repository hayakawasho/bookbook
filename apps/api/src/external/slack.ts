import type { SessionUser } from '../auth'

export type SlackNotificationType = 'checkout' | 'return' | 'new-book' | 'cancel-new-book'

export type SlackBookInfo = {
  title: string
  author?: string
  publisher?: string
  description?: string
  coverSrc?: string
}

const LOCATION_LABEL: Record<string, string> = {
  daikanyama: '代官山オフィス',
  okinawa: '沖縄ブランチ',
}

const NEW_BOOK_COLOR = '#DEFF00'
const DESCRIPTION_LIMIT = 140

function checkoutBorrowerSlackLabel(user: SessionUser): string {
  const name = user.name?.trim()
  return name ? name : user.email
}

function trimText(str: string, limit: number): string {
  return [...str].length > limit ? str.substring(0, limit) + '...' : str
}

function buildSlackMessage(
  type: SlackNotificationType,
  location: string,
  book: SlackBookInfo,
  sessionUser?: SessionUser,
): string {
  const locationLabel = LOCATION_LABEL[location] ?? location

  switch (type) {
    case 'checkout':
      return sessionUser
        ? `📖 ${checkoutBorrowerSlackLabel(sessionUser)}さんが${locationLabel}の本棚から『${book.title}』を借りました。`
        : `📖 ${locationLabel}の本棚から『${book.title}』が貸し出されました。`
    case 'return':
      return `📗 『${book.title}』が${locationLabel}の本棚に戻りました。また借りられます。`
    case 'new-book':
      return `📚 ${locationLabel}の本棚に『${book.title}』が追加されました。今日から借りられます。`
    case 'cancel-new-book':
      return `『${book.title}』の追加は取り消されました。`
  }
}

export function buildSlackPayload(
  type: SlackNotificationType,
  location: string,
  book: SlackBookInfo,
  sessionUser?: SessionUser,
) {
  // 取り消しは訂正の連絡なので、書誌の添付は付けず本文のみにする
  if (type === 'cancel-new-book') {
    return {
      blocks: [
        {
          text: {
            text: buildSlackMessage(type, location, book, sessionUser),
            type: 'plain_text',
          },
          type: 'section',
        },
      ],
    }
  }

  return {
    attachments: [
      {
        color: type === 'new-book' ? NEW_BOOK_COLOR : undefined,
        fields: [
          { title: '著者', value: book.author ?? ' - ' },
          { title: '出版社', value: book.publisher ?? ' - ' },
          {
            title: '概要',
            value: book.description ? trimText(book.description, DESCRIPTION_LIMIT) : ' - ',
          },
        ],
        image_url: book.coverSrc,
      },
    ],
    blocks: [
      {
        text: {
          text: buildSlackMessage(type, location, book, sessionUser),
          type: 'plain_text',
        },
        type: 'section',
      },
    ],
  }
}

/** 失敗しても API 応答には影響させない best-effort 通知 */
export async function sendSlackNotification(
  webhookUrl: string | undefined,
  type: SlackNotificationType,
  location: string,
  book: SlackBookInfo,
  sessionUser?: SessionUser,
): Promise<void> {
  if (!webhookUrl) {
    return
  }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildSlackPayload(type, location, book, sessionUser)),
    })
    if (!res.ok) {
      console.error('Slack webhook failed', { status: res.status })
    }
  } catch (err) {
    console.error('Slack webhook error', err)
  }
}
