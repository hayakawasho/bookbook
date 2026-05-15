/**
 * Production のみ Service Worker を登録する（開発時は更新の混乱を避ける）。
 */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD) {
    return
  }
  if (!('serviceWorker' in navigator)) {
    return
  }

  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').catch((err: unknown) => {
      console.warn('[bookbook] Service Worker の登録に失敗しました', err)
    })
  })
}
