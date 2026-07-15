import { useLocation, useNavigate } from 'react-router'

export function useBackWithFallback() {
  const navigate = useNavigate()
  const location = useLocation()

  return (fallbackPath: string) => {
    // key === 'default' は直リンク・リロード直後で履歴に戻り先がない状態
    if (location.key === 'default') {
      navigate(fallbackPath, { replace: true })
      return
    }
    navigate(-1)
  }
}
