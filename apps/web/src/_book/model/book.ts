export type BookMetadata = {
  isbn: string
  title: string
  author?: string
  publisher?: string
  publishedDate?: Date
  cover: { src?: string }
  description?: string
  availableCount: number
  total: number
}
