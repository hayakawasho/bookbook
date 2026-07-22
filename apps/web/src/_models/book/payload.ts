export type BookPayload = {
  title: string
  author?: string
  publisher?: string
  publishedDate?: Date
  cover: { src?: string }
  description?: string
  pageCount?: number
  availableCount: number
  total: number
}

/** Book から派生したデータに載る本のスナップショット（ISBN 付き） */
export type BookSnapshot = BookPayload & {
  isbn: string
}

export function pickBookPayload(snapshot: BookSnapshot): BookPayload {
  const {
    title,
    author,
    publisher,
    publishedDate,
    cover,
    description,
    pageCount,
    availableCount,
    total,
  } = snapshot

  return {
    title,
    author,
    publisher,
    publishedDate,
    cover,
    description,
    pageCount,
    availableCount,
    total,
  }
}
