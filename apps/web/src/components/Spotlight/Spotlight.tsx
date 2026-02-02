'use client';

import type { TvSeries } from '@tvseri.es/schemas';
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
    (index: number, isUserInteraction: boolean) => {
      const item = items[index]!;
      const backgroundColor = item.backdropColor;
      const backgroundImage = item.backdropImage as string;

      preloadImage(backgroundImage).finally(() => {
        updateBackground(backgroundColor, backgroundImage, {
          enableTransitions: isUserInteraction,
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
