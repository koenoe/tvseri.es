'use client';

import { useCallback } from 'react';

import preloadImage from '@/utils/preloadImage';
import type { SpotlightTvSeries } from '@/utils/toSpotlightTvSeries';
import { getBackgroundImageProps } from '../Background/BackgroundImage';
import { useBackground } from '../Background/BackgroundProvider';
import Carousel from '../Carousel/Carousel';
import SpotlightItem from './SpotlightItem';

export default function Spotlight({
  className,
  items,
}: Readonly<{
  className?: string;
  items: ReadonlyArray<SpotlightTvSeries>;
}>) {
  const updateBackground = useBackground((state) => state.setBackground);

  const itemRenderer = useCallback(
    (index: number) => (
      <SpotlightItem
        index={index}
        item={items[index]!}
        priority={index === 0}
      />
    ),
    [items],
  );

  const handleChange = useCallback(
    (index: number) => {
      const item = items[index]!;
      const backgroundColor = item.backdropColor;
      const backgroundImage = item.backdropImage as string;
      const { src, ...responsive } = getBackgroundImageProps(backgroundImage);

      preloadImage(src, responsive).finally(() => {
        updateBackground({
          backgroundColor,
          backgroundImage,
        });
      });
    },
    [items, updateBackground],
  );

  return (
    <Carousel
      className={className}
      itemCount={items.length}
      itemRenderer={itemRenderer}
      onChange={handleChange}
      restoreKey="spotlight"
    />
  );
}
