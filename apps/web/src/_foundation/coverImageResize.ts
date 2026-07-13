const DEFAULT_MAX_EDGE = 640
const DEFAULT_QUALITY = 0.8

export function fitWithin(
  width: number,
  height: number,
  maxEdge: number,
): { width: number; height: number } {
  const longEdge = Math.max(width, height)

  if (longEdge <= maxEdge) {
    return { width, height }
  }

  const scale = maxEdge / longEdge

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

export async function resizeCoverImage(
  file: Blob,
  options?: { maxEdge?: number; quality?: number },
): Promise<Blob> {
  const maxEdge = options?.maxEdge ?? DEFAULT_MAX_EDGE
  const quality = options?.quality ?? DEFAULT_QUALITY

  const bitmap = await createImageBitmap(file)

  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height, maxEdge)

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext('2d')

    if (!ctx) {
      throw new Error('resizeCoverImage: failed to get 2d context')
    }

    ctx.drawImage(bitmap, 0, 0, width, height)

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('resizeCoverImage: toBlob returned null'))
            return
          }

          resolve(blob)
        },
        'image/jpeg',
        quality,
      )
    })
  } finally {
    bitmap.close()
  }
}
