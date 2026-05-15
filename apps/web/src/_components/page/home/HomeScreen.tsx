import { BottomSheet } from '../../ui/BottomSheet'
import { Dialog } from '../../ui/Dialog'
import { Toast } from '../../ui/Toast'
import { HomeBarcodePanel } from './HomeBarcodePanel'
import { HomeExistingBookSheet, HomeExternalBookSheet } from './HomeBookSheet'
import { SvgBookBook } from './SvgBookbook'
import {
  HOME_BARCODE_CAMERA_ELEMENT_ID,
  useHomeScreen,
} from './useHomeScreen'

export function HomeScreen() {
  const {
    cameraOpen,
    dialogConfig,
    fileInputRef,
    handleAddBook,
    handleIncrementBook,
    handleChangeIsbnInput,
    handleCheckout,
    handleManualSearch,
    handlePickImage,
    handleSheetClose,
    handleToggleCamera,
    isbnInput,
    notFound,
    setDialogConfig,
    setToast,
    sheetMode,
    toast,
  } = useHomeScreen()

  return (
    <div className="min-h-full grid h-[stretch] grid-rows-[minmax(288px,50dvh)_auto] bg-background">
      <div className="min-h-0 flex flex-col h-full bg-[#2B2E31] relative">
        <div className="flex-1 min-h-0 flex flex-col ___px-[22px] ___py-4 gap-3">
          <HomeBarcodePanel
            cameraElementId={HOME_BARCODE_CAMERA_ELEMENT_ID}
            cameraOpen={cameraOpen}
            fileInputRef={fileInputRef}
            isbnInput={isbnInput}
            notFound={notFound}
            onChangeIsbnInput={handleChangeIsbnInput}
            onManualSearch={handleManualSearch}
            onPickImage={handlePickImage}
            onToggleCamera={handleToggleCamera}
          />
        </div>
      </div>

      <div className="relative overflow-hidden bg-surface px-[22px] pt-[20px] pb-[105px] shrink-0 z-[1] -mt-5 rounded-t-[20px] shadow-[0_-10px_32px_rgba(0,0,0,0.12)] flex flex-col items-center gap-5 border-0">
        <div className="w-full h-full grid items-center">
          <div>
            <h1 className="m-0 text-center text-[30px] font-bold leading-[38px] text-text tracking-normal">
              Scan Barcode
            </h1>
            <p className="m-0 mt-3 text-center text-xs leading-[17px] px-2">
              『978』から始まる本のバーコードを読み取ろう！
            </p>
          </div>
        </div>
        <div className="absolute translate-y-full bottom-[105px]">
          <SvgBookBook />
        </div>
      </div>

      <BottomSheet open={sheetMode !== null} onClose={handleSheetClose}>
        {sheetMode?.kind === 'existing' && (
          <HomeExistingBookSheet
            book={sheetMode.book}
            onAddCopy={handleIncrementBook}
            onCheckout={handleCheckout}
          />
        )}
        {sheetMode?.kind === 'external' && (
          <HomeExternalBookSheet
            book={sheetMode.book}
            onAddBook={handleAddBook}
          />
        )}
      </BottomSheet>

      {dialogConfig && (
        <Dialog
          message={dialogConfig.message}
          confirmLabel={dialogConfig.confirmLabel}
          cancelLabel={dialogConfig.cancelLabel ?? 'キャンセル'}
          width={dialogConfig.width}
          onConfirm={dialogConfig.onConfirm}
          onCancel={() => {
            if (dialogConfig.onCancel) {
              dialogConfig.onCancel()
            } else {
              setDialogConfig(null)
            }
          }}
        />
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  )
}
