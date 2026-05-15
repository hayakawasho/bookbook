import type { BookMetadata } from '../../_book/model'
import type { Location } from '../../_foundation/const'
import type {
  BookCountOperation,
  BookRepository,
  ExternalBookInfo,
  FindByIsbnResult,
} from './interface'

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

export class MockBookRepository implements BookRepository {
  private books: BookMetadata[] = INITIAL_BOOKS.map(b => ({ ...b }))

  findByIsbn(isbn: string, _location: Location): Promise<FindByIsbnResult> {
    const registered = this.books.find(b => b.isbn === isbn)
    if (registered) return Promise.resolve({ status: 'registered', book: registered })
    const external = EXTERNAL_BOOKS[isbn]
    if (external) return Promise.resolve({ status: 'external', book: external })
    return Promise.resolve({ status: 'notfound' })
  }

  findMany(query: string, _location: Location): Promise<BookMetadata[]> {
    if (!query || query.trim() === '') return Promise.resolve([...this.books])
    const lower = query.toLowerCase()
    return Promise.resolve(
      this.books.filter(
        b =>
          b.title.toLowerCase().includes(lower) ||
          (b.author?.toLowerCase().includes(lower) ?? false),
      ),
    )
  }

  create(book: ExternalBookInfo, _location: Location): Promise<void> {
    const row: BookMetadata = { ...book, availableCount: 1, total: 1 }
    this.books.push({ ...row })
    return Promise.resolve()
  }

  updateCount(isbn: string, operation: BookCountOperation, _location: Location): Promise<void> {
    const book = this.books.find(b => b.isbn === isbn)
    if (!book) return Promise.resolve()
    switch (operation) {
      case 'add-copy':
        book.total += 1
        book.availableCount += 1
        break
      case 'checkout':
        if (book.availableCount <= 0) return Promise.resolve()
        book.availableCount -= 1
        break
      case 'return':
        if (book.availableCount >= book.total) return Promise.resolve()
        book.availableCount += 1
        break
    }
    return Promise.resolve()
  }
}
