import { Book, toBookId } from '../../_models/book'

import type { Location } from '../../_foundation/const'
import type { BookRepository, ExternalBookInfo, FindByIsbnResult } from '../../_usecases/book/ports'

const INITIAL_BOOKS: Book[] = [
  Book.create({
    id: toBookId('9784873119038'),
    title: 'リーダブルコード',
    author: 'Dustin Boswell, Trevor Foucher',
    publisher: 'オライリージャパン',
    cover: {},
    availableCount: 2,
    total: 2,
  }),
  Book.create({
    id: toBookId('9784873117317'),
    title: 'Clean Architecture 達人に学ぶソフトウェアの構造と設計',
    author: 'Robert C. Martin',
    publisher: 'KADOKAWA',
    cover: {},
    availableCount: 1,
    total: 2,
  }),
  Book.create({
    id: toBookId('9784873116686'),
    title: 'ドメイン駆動設計',
    author: 'Eric Evans',
    publisher: '翔泳社',
    cover: {},
    availableCount: 0,
    total: 1,
  }),
  Book.create({
    id: toBookId('9784815607197'),
    title: 'デザインシステム',
    author: '吉井弘一郎',
    publisher: 'BNN新社',
    cover: {},
    availableCount: 1,
    total: 1,
  }),
  Book.create({
    id: toBookId('9784798167299'),
    title: 'テスト駆動開発',
    author: 'Kent Beck',
    publisher: '翔泳社',
    cover: {},
    availableCount: 2,
    total: 2,
  }),
]

const EXTERNAL_BOOKS: Record<string, ExternalBookInfo> = {
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
  '9784798163214': {
    isbn: '9784798163214',
    title: 'エンジニアリング組織論への招待',
    author: '広木大地',
    publisher: '技術評論社',
    cover: { src: 'https://example.com/covers/9784798163214.jpg' },
  },
}

function matchesBookSearchQuery(book: Book, query: string): boolean {
  const lower = query.toLowerCase()
  const matchesTitle = book.title.toLowerCase().includes(lower)
  const matchesAuthor = book.author?.toLowerCase().includes(lower) ?? false

  return matchesTitle || matchesAuthor
}

function createRegisteredBookFromExternal(book: ExternalBookInfo): Book {
  return Book.create({
    id: toBookId(book.isbn),
    title: book.title,
    author: book.author,
    publisher: book.publisher,
    publishedDate: book.publishedDate,
    cover: book.cover,
    description: book.description,
    availableCount: 1,
    total: 1,
  })
}

export class MockBookRepository implements BookRepository {
  private books: Book[] = INITIAL_BOOKS.map((b) => ({ ...b }))

  findByIsbn(isbn: string, _location: Location): Promise<FindByIsbnResult> {
    const registered = this.books.find((b) => String(b.id) === isbn)

    if (registered) {
      return Promise.resolve({ status: 'registered', book: registered })
    }

    const external = EXTERNAL_BOOKS[isbn]

    if (external) {
      return Promise.resolve({ status: 'external', book: external })
    }

    return Promise.resolve({ status: 'notfound' })
  }

  findMany(query: string, _location: Location): Promise<Book[]> {
    if (!query || query.trim() === '') {
      return Promise.resolve([...this.books])
    }

    const filtered = this.books.filter((b) => matchesBookSearchQuery(b, query))
    return Promise.resolve(filtered)
  }

  createItem(book: ExternalBookInfo, _location: Location): Promise<void> {
    this.books.push(createRegisteredBookFromExternal(book))
    return Promise.resolve()
  }

  addCopy(isbn: string, _location: Location): Promise<Book> {
    const target = this.books.find((b) => String(b.id) === isbn)

    if (!target) {
      return Promise.reject(new Error(`MockBookRepository: book not found for isbn=${isbn}`))
    }

    const updated = Book.addStock(target)
    this.internalUpdateItem(updated)
    return Promise.resolve(updated)
  }

  deleteItem(isbn: string, _location: Location): Promise<void> {
    const target = this.books.find((b) => String(b.id) === isbn)

    // サーバー側と同じく登録直後（total=1・貸出なし）のみ取り消せる
    if (!target || target.total !== 1 || target.availableCount !== 1) {
      return Promise.reject(new Error(`MockBookRepository: cannot undo registration for ${isbn}`))
    }

    this.books = this.books.filter((b) => String(b.id) !== isbn)
    return Promise.resolve()
  }

  uploadCoverImage(isbn: string, image: Blob): Promise<{ src: string }> {
    const target = this.books.find((b) => String(b.id) === isbn)

    if (!target) {
      return Promise.reject(new Error(`MockBookRepository: book not found for isbn=${isbn}`))
    }

    const src = URL.createObjectURL(image)
    this.internalUpdateItem(Book.create({ ...target, cover: { src } }))

    return Promise.resolve({ src })
  }

  // MockHistoryRepository が貸出/返却時の在庫増減に使う port 外の内部更新手段
  internalUpdateItem(book: Book): void {
    const isbn = String(book.id)
    this.books = this.books.map((b) => (String(b.id) === isbn ? book : b))
  }
}
