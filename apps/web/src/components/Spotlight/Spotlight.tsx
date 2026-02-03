'use client';

import type { TvSeries } from '@tvseri.es/schemas';
import { useCallback } from 'react';

import preloadImage from '@/utils/preloadImage';
import { useBackground } from '../Background/BackgroundProvider';
import Carousel from '../Carousel/Carousel';
import SpotlightItem from './SpotlightItem';

export default function Spotlight({
  className,
  items,
}: Readonly<{
  className?: string;
  items: TvSeries[];
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

      preloadImage(backgroundImage).finally(() => {
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
