import { useState } from 'react'
import noImageFallback from '../../../assets/no_image.png'

type BookCoverProps = { src?: string; alt: string }

function BookCoverInner({ src, alt }: BookCoverProps) {
  const [errored, setErrored] = useState(false)
  const showFallback = !src || errored
  return (
    <img
      src={showFallback ? noImageFallback : src}
      alt={alt}
      width={103}
      height={145}
      className="w-[103px] h-[145px] object-cover block shrink-0 bg-border"
      draggable={false}
      onError={showFallback ? undefined : () => setErrored(true)}
    />
  )
}

export function BookCover(props: BookCoverProps) {
  return <BookCoverInner key={props.src ?? ''} {...props} />
}
