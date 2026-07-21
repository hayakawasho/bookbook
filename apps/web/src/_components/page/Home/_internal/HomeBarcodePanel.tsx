type HomeBarcodePanelProps = {
  cameraElementId: string
  cameraOpen: boolean
  isDetecting: boolean
  isbnInput: string
  notFound: boolean
  onChangeIsbnInput: (value: string) => void
  onManualSearch: () => void
}

export function HomeBarcodePanel({
  cameraElementId,
  cameraOpen,
  isDetecting,
  isbnInput,
  notFound,
  onChangeIsbnInput,
  onManualSearch,
}: HomeBarcodePanelProps) {
  return (
    <div className="flex-1 min-h-0 flex flex-col w-full box-border relative">
      {!cameraOpen && (
        <div className="flex-1 min-h-0 flex flex-col gap-3 p-4">
          <div className="relative flex gap-2 items-stretch min-[360px]:flex-row flex-col">
            <input
              className="flex-1 min-h-[44px] px-0 py-2 border-0 border-b border-border bg-transparent text-sm placeholder:text-middle outline-none isbn-input text-white"
              type="text"
              inputMode="numeric"
              placeholder="ISBNを入力（例: 9784873119038）"
              value={isbnInput}
              onChange={(e) => onChangeIsbnInput(e.target.value)}
              maxLength={32}
            />
            <button
              className="inline-flex items-center justify-center min-h-[44px] px-5 bg-primary-contrast text-primary border-0 text-sm font-semibold cursor-pointer whitespace-nowrap disabled:bg-middle disabled:text-primary-contrast/70 disabled:cursor-not-allowed shrink-0"
              onClick={onManualSearch}
              disabled={isbnInput.trim().length === 0}
            >
              検索
            </button>
            {notFound && (
              <div className="absolute -bottom-12 pointer-events-none -translate-y-full">
                <p className="m-0 text-xs text-error shrink-0">見つかりませんでした</p>
              </div>
            )}
          </div>
        </div>
      )}
      <div className="absolute inset-0 pointer-events-none">
        {cameraOpen && (
          <>
            <div
              id={cameraElementId}
              className="flex-1 basis-0 min-h-[200px] w-full bg-black/60 overflow-hidden h-[stretch]"
              role="presentation"
              aria-live="polite"
            />
            <div
              className={`barcode-scan-guide${isDetecting ? ' is-detecting' : ''}`}
              aria-hidden="true"
            />
          </>
        )}
      </div>
    </div>
  )
}
