import { SvgBookBook } from './SvgBookbook'

export function HomeScanHero() {
  return (
    <div className="relative overflow-hidden bg-surface px-[22px] pt-[20px] pb-[105px] shrink-0 z-1 -mt-5 rounded-t-[20px] shadow-[0_-10px_32px_rgba(0,0,0,0.12)] flex flex-col items-center gap-5 border-0">
      <div className="w-full h-full grid items-center">
        <div>
          <h1 className="m-0 text-center text-[30px] font-bold text-text tracking-normal">
            Scan Barcode
          </h1>
          <p className="m-0 mt-3 text-center text-xs px-2">
            『978』から始まる本のバーコードを読み取ろう！
          </p>
        </div>
      </div>
      <div className="absolute translate-y-full bottom-[105px]">
        <SvgBookBook />
      </div>
    </div>
  )
}
