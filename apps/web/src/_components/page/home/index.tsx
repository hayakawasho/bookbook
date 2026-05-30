import { BottomSheet } from '../../ui/BottomSheet'
import { Dialog } from '../../ui/Dialog'
import { Toast } from '../../ui/Toast'

import { HomeBarcodePanel } from './_internal/HomeBarcodePanel'
import { HomeExistingBookSheet, HomeExternalBookSheet } from './_internal/HomeBookSheet'
import { HomeScanHero } from './_internal/HomeScanHero'
import { HOME_BARCODE_CAMERA_ELEMENT_ID, useHomeScreen } from './useHomeScreen'

export function HomeScreen() {
  const {
    cameraOpen,
    dialogConfig,
    fileInputRef,
    handleAddBook,
    handleRestockBook,
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

      <HomeScanHero />

      <BottomSheet open={sheetMode !== null} onClose={handleSheetClose}>
        {sheetMode?.kind === 'existing' && (
          <HomeExistingBookSheet
            book={sheetMode.book}
            onAddCopy={handleRestockBook}
            onCheckout={handleCheckout}
          />
        )}
        {sheetMode?.kind === 'external' && (
          <HomeExternalBookSheet book={sheetMode.book} onAddBook={handleAddBook} />
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
        <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />
      )}
    </div>
  )
}
