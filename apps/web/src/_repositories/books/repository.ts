import type { BookMetadata } from '../../_book/model'

const INITIAL_BOOKS: BookMetadata[] = [
  {
    isbn: '9784873119038',
    title: 'リーダブルコード',
    author: 'Dustin Boswell, Trevor Foucher',
    publisher: 'オライリージャパン',
    cover: {},
    availableCount: 2,
    total: 2,
  },
  {
    isbn: '9784873117317',
    title: 'Clean Architecture 達人に学ぶソフトウェアの構造と設計',
    author: 'Robert C. Martin',
    publisher: 'KADOKAWA',
    cover: {},
    availableCount: 1,
    total: 2,
  },
  {
    isbn: '9784873116686',
    title: 'ドメイン駆動設計',
    author: 'Eric Evans',
    publisher: '翔泳社',
    cover: {},
    availableCount: 0,
    total: 1,
  },
  {
    isbn: '9784815607197',
    title: 'デザインシステム',
    author: '吉井弘一郎',
    publisher: 'BNN新社',
    cover: {},
    availableCount: 1,
    total: 1,
  },
  {
    isbn: '9784798167299',
    title: 'テスト駆動開発',
    author: 'Kent Beck',
    publisher: '翔泳社',
    cover: {},
    availableCount: 2,
    total: 2,
  },
]

type ExternalBook = Omit<BookMetadata, 'availableCount' | 'total'>

const EXTERNAL_BOOKS: Record<string, ExternalBook> = {
  '9784295012641': {
    isbn: '9784295012641',
    title: 'チームトポロジー',
    author: 'Matthew Skelton, Manuel Pais',
    publisher: '日本能率協会マネジメントセンター',
    cover: {},
  },
  '9784820729020': {
    isbn: '9784820729020',
    title: 'アジャイルサムライ',
    author: 'Jonathan Rasmusson',
    publisher: '翔泳社',
    cover: {},
  },
}

export class MockBookRepository {
  private books: BookMetadata[] = INITIAL_BOOKS.map(b => ({ ...b }))

  findByIsbn(isbn: string): BookMetadata | null {
    return this.books.find(b => b.isbn === isbn) ?? null
  }

  fetchExternal(isbn: string): ExternalBook | null {
    return EXTERNAL_BOOKS[isbn] ?? null
  }

  add(book: BookMetadata): void {
    this.books.push({ ...book })
  }

  addCopy(isbn: string): void {
    const book = this.books.find(b => b.isbn === isbn)
    if (!book) {
      return
    }
    book.total += 1
    book.availableCount += 1
  }

  checkout(isbn: string): void {
    const book = this.books.find(b => b.isbn === isbn)
    if (!book || book.availableCount <= 0) {
      return
    }
    book.availableCount -= 1
  }

  returnBook(isbn: string): void {
    const book = this.books.find(b => b.isbn === isbn)
    if (!book || book.availableCount >= book.total) {
      return
    }
    book.availableCount += 1
  }

  findAll(q?: string): BookMetadata[] {
    if (!q || q.trim() === '') {
      return [...this.books]
    }
    const lower = q.toLowerCase()
    return this.books.filter(
      b =>
        b.title.toLowerCase().includes(lower) ||
        (b.author?.toLowerCase().includes(lower) ?? false),
    )
  }
}
