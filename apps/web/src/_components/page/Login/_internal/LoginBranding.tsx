import { SvgBookbook } from './SvgBookbook'

export function LoginBranding() {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-8 pb-10 pt-8">
      <div className="w-[min(292px,min(74vw,calc(100vw-44px)))] max-w-full shrink-0">
        <SvgBookbook />
      </div>
      <h1 className="whitespace-pre-line text-center text-[30px] font-bold leading-[38px] tracking-normal">
        {'本を身近に。\n広がる交流。'}
      </h1>
    </div>
  )
}
