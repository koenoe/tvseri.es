'use client';

import { memo, type ReactNode, useState } from 'react';

import Image, { type ImageProps } from 'next/image';

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
    // eslint-disable-next-line jsx-a11y/alt-text
    <Image
      {...rest}
      src={imgSrc}
      onError={() => {
        if (typeof fallback === 'string') {
          setImgSrc(fallback);
        } else {
          setFallbackComponent(fallback());
        }
      }}
    />
  );
}

export default memo(ImageWithFallback);
