export type BookBibliographyDto = {
  isbn: string
  title: string
  author?: string
  publisher?: string
  publishedDate?: string
  cover: { src?: string }
  description?: string
  pageCount?: number
}

export type BookDto = BookBibliographyDto & {
  availableCount: number
  total: number
}

export type ExternalBookDto = BookBibliographyDto
