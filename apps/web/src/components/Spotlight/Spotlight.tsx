'use client';

import { useCallback } from 'react';

import type { TvSeries } from '@/types/tv-series';
import preloadImage from '@/utils/preloadImage';

import SpotlightItem from './SpotlightItem';
import Carousel from '../Carousel/Carousel';
import { usePageStore } from '../Page/PageStoreProvider';

export default function Spotlight({
  className,
  items,
}: Readonly<{
  className?: string;
  items: TvSeries[];
}>) {
  const updateBackground = usePageStore((state) => state.setBackground);

  const itemRenderer = useCallback(
    (index: number) => <SpotlightItem index={index} item={items[index]!} />,
    [items],
  );

  const handleChange = useCallback(
    (index: number) => {
      const item = items[index]!;
      const backgroundColor = item.backdropColor;
      const backgroundImage = item.backdropImage as string;

      preloadImage(backgroundImage).finally(() => {
        updateBackground({
          backgroundImage,
          backgroundColor,
        });
      });
    },
    [items, updateBackground],
  );

  return (
    <Carousel
      className={className}
      itemRenderer={itemRenderer}
      itemCount={items.length}
      onChange={handleChange}
      restoreKey="spotlight"
    />
  );
}
