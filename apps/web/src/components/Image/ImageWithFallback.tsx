'use client';

import Image, { type ImageProps } from 'next/image';
import { memo, type ReactNode, useCallback, useState } from 'react';

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

  const handleError = useCallback(() => {
    if (typeof fallback === 'string') {
      setImgSrc(fallback);
    } else {
      setFallbackComponent(fallback());
    }
  }, [fallback]);

  if (FallbackComponent) {
    return FallbackComponent;
  }

  return <Image {...rest} onError={handleError} src={imgSrc} />;
}

export default memo(ImageWithFallback);
