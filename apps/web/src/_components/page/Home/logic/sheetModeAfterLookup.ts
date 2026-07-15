import type { FindByIsbnResult } from '../../../../_usecases/book/ports'
import type { SheetMode } from '../types'

export function sheetModeAfterLookup(bookResult: FindByIsbnResult): SheetMode | 'not-found' {
  if (bookResult.status === 'registered') {
    return { kind: 'existing', book: bookResult.book }
  }

  if (bookResult.status === 'external') {
    return { kind: 'external', book: bookResult.book }
  }

  return 'not-found'
}
