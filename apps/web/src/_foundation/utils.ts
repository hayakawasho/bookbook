/**
 * スキャナー・手入力・画像読取で得た生文字列を ISBN-13 に正規化する。
 * ISBN用EAN-13（978/979プレフィックスかつチェックディジット有効）はそのまま返す。
 * ISBN-10 (9桁数字 + チェックディジット) は ISBN-13 に変換する。
 * それ以外は null を返す。
 */
export function normalizeIsbnBarcode(raw: string): string | null {
  const cleaned = raw.replace(/[-\s]/g, '')

  if (/^97[89]\d{10}$/.test(cleaned) && hasValidIsbn13CheckDigit(cleaned)) {
    return cleaned
  }

  if (/^\d{9}[\dX]$/i.test(cleaned)) {
    const isbn10 = cleaned.toUpperCase()
    return hasValidIsbn10CheckDigit(isbn10) ? isbn10ToIsbn13(isbn10) : null
  }

  return null
}

function hasValidIsbn10CheckDigit(isbn: string): boolean {
  let sum = 0
  for (let i = 0; i < 10; i++) {
    sum += (isbn[i] === 'X' ? 10 : Number(isbn[i])) * (10 - i)
  }
  return sum % 11 === 0
}

function hasValidIsbn13CheckDigit(isbn: string): boolean {
  let sum = 0
  for (let i = 0; i < 12; i++) {
    sum += Number(isbn[i]) * (i % 2 === 0 ? 1 : 3)
  }
  return (10 - (sum % 10)) % 10 === Number(isbn[12])
}

function isbn10ToIsbn13(isbn10: string): string {
  const body = '978' + isbn10.slice(0, 9)
  let sum = 0
  for (let i = 0; i < 12; i++) {
    sum += parseInt(body[i]) * (i % 2 === 0 ? 1 : 3)
  }
  const check = (10 - (sum % 10)) % 10
  return body + String(check)
}
