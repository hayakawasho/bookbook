/**
 * スキャナー・手入力・画像読取で得た生文字列を ISBN-13 に正規化する。
 * EAN-13 (13桁数字) はそのまま返す。
 * ISBN-10 (9桁数字 + チェックディジット) は ISBN-13 に変換する。
 * それ以外は null を返す。
 */
export function normalizeIsbnBarcode(raw: string): string | null {
  const cleaned = raw.replace(/[-\s]/g, '')

  if (/^\d{13}$/.test(cleaned)) {
    return cleaned
  }

  if (/^\d{9}[\dX]$/i.test(cleaned)) {
    return isbn10ToIsbn13(cleaned.toUpperCase())
  }

  return null
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
