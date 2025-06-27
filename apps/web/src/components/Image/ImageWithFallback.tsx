'use client';

import Image, { type ImageProps } from 'next/image';
import { memo, type ReactNode, useState } from 'react';

function ImageWithFallback({
  fallback,
  src,
  ...rest
}: ImageProps &
  Readonly<{
    fallback: string | (() => ReactNode);
  }>) {
  const [imgSrc, setImgSrc] = useState(src);
  const [FallbackComponent, setFallbackComponent] =
    useState<ReactNode | null>();

  if (FallbackComponent) {
    return FallbackComponent;
  }

  return (
    <Image
      {...rest}
      onError={() => {
        if (typeof fallback === 'string') {
          setImgSrc(fallback);
        } else {
          setFallbackComponent(fallback());
        }
      }}
      src={imgSrc}
    />
  );
}

export default memo(ImageWithFallback);
