import { describe, expect, it } from 'vitest'

import { buildSlackPayload } from './slack'

type PayloadWithAttachments = { attachments?: Array<{ image_url?: string }> }

describe('buildSlackPayload', () => {
  it('外部 URL の表紙は image_url に残る', () => {
    const payload = buildSlackPayload('checkout', 'daikanyama', {
      title: 'テスト本',
      coverSrc: 'https://books.google.com/cover.jpg',
    }) as PayloadWithAttachments

    expect(payload.attachments?.[0]?.image_url).toBe('https://books.google.com/cover.jpg')
  })

  it('自前サムネイルの相対 URL は image_url から除外される', () => {
    const payload = buildSlackPayload('checkout', 'daikanyama', {
      title: 'テスト本',
      coverSrc: '/api/thumbnails/9784000000000',
    }) as PayloadWithAttachments

    expect(payload.attachments?.[0]?.image_url).toBeUndefined()
  })
})
