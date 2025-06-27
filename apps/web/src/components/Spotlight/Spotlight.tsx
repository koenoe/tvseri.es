'use client';

import type { TvSeries } from '@tvseri.es/types';
import { useCallback } from 'react';

import preloadImage from '@/utils/preloadImage';
import Carousel from '../Carousel/Carousel';
import { usePageStore } from '../Page/PageStoreProvider';
import SpotlightItem from './SpotlightItem';

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
