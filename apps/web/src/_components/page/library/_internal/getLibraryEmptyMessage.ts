export function getLibraryEmptyMessage(query: string): string {
  const hasQuery = query.trim().length > 0

  if (hasQuery) {
    return `『${query}』に関連する本は見つかりませんでした`
  }

  return '本が登録されていません'
}
