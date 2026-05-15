import type { ChangeEvent, RefObject } from 'react'

type HomeBarcodePanelProps = {
  cameraElementId: string
  cameraOpen: boolean
  fileInputRef: RefObject<HTMLInputElement | null>
  isbnInput: string
  notFound: boolean
  onChangeIsbnInput: (value: string) => void
  onManualSearch: () => void
  onPickImage: (e: ChangeEvent<HTMLInputElement>) => void
  onToggleCamera: () => void
}

export function HomeBarcodePanel({
  cameraElementId,
  cameraOpen,
  fileInputRef,
  isbnInput,
  notFound,
  onChangeIsbnInput,
  onManualSearch,
  onPickImage,
  onToggleCamera,
}: HomeBarcodePanelProps) {
  return (
    <div className="flex-1 min-h-0 flex flex-col w-full ___border-[10px] __border-accent box-border relative">
      <div className="flex-1 min-h-0 flex flex-col gap-3 __p-4">
        <div className="opacity-10 flex gap-2 items-stretch min-[360px]:flex-row flex-col">
          <input
            className="flex-1 min-h-[44px] px-0 py-2 border-0 border-b border-border bg-transparent text-sm text-primary-contrast placeholder:text-middle outline-none isbn-input"
            type="text"
            inputMode="numeric"
            placeholder="ISBNを入力（例: 9784873119038）"
            value={isbnInput}
            onChange={e => onChangeIsbnInput(e.target.value)}
            maxLength={32}
          />
          <button
            className="inline-flex items-center justify-center min-h-[44px] px-5 bg-primary-contrast text-primary border-0 text-sm font-semibold cursor-pointer whitespace-nowrap disabled:bg-middle disabled:text-primary-contrast/70 disabled:cursor-not-allowed shrink-0"
            onClick={onManualSearch}
            disabled={isbnInput.trim().length === 0}
          >
            読み取り
          </button>
        </div>
        <div className="opacity-10 flex flex-wrap gap-2 mt-1">
          <button
            type="button"
            className="min-h-[40px] px-3 bg-surface/80 text-primary-contrast text-xs font-semibold border-0 cursor-pointer"
            onClick={onToggleCamera}
          >
            {cameraOpen ? 'カメラを終了' : 'カメラで読む'}
          </button>
          <button
            type="button"
            className="min-h-[40px] px-3 bg-surface/80 text-primary-contrast text-xs font-semibold border-0 cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            画像から読む
          </button>
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="fixed w-px h-px opacity-0 overflow-hidden pointer-events-none -z-10"
        tabIndex={-1}
        onChange={onPickImage}
      />
      <div className="absolute inset-0 pointer-events-none">
        {notFound && (
          <p className="m-0 text-xs text-error shrink-0">見つかりませんでした</p>
        )}
        {cameraOpen ? (
          <div
            id={cameraElementId}
            className="flex-1 basis-0 min-h-[200px] w-full bg-black/60 overflow-hidden h-[stretch]"
            role="presentation"
            aria-live="polite"
          />
        ) : (
          <div className="flex-1 min-h-0 min-w-0" aria-hidden />
        )}
      </div>
    </div>
  )
}
