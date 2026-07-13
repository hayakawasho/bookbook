import { useCallback, useEffect, useRef, useState } from 'react'

import { resizeCoverImage } from '../../../../_foundation/coverImageResize'

export function useCoverCapture() {
  const [pendingCover, setPendingCover] = useState<Blob | null>(null)
  const [previewSrc, setPreviewSrc] = useState<string | undefined>(undefined)
  const previewSrcRef = useRef<string | undefined>(undefined)

  const revokePreview = useCallback(() => {
    if (previewSrcRef.current) {
      URL.revokeObjectURL(previewSrcRef.current)
      previewSrcRef.current = undefined
    }
  }, [])

  const clear = useCallback(() => {
    revokePreview()
    setPendingCover(null)
    setPreviewSrc(undefined)
  }, [revokePreview])

  const handleSelectPhoto = useCallback(
    async (file: File) => {
      try {
        const resized = await resizeCoverImage(file)
        const src = URL.createObjectURL(resized)

        revokePreview()
        previewSrcRef.current = src
        setPendingCover(resized)
        setPreviewSrc(src)
      } catch {
        // 撮影画像の変換に失敗しても登録フロー自体は継続させたいので無視する
      }
    },
    [revokePreview],
  )

  useEffect(() => revokePreview, [revokePreview])

  return {
    pendingCover,
    previewSrc,
    handleSelectPhoto,
    clear,
  }
}
