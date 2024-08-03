'use client';

import { type RefObject, useCallback } from 'react';

import type { TvSeries } from '@/types/tv-series';

import SpotlightItem from './SpotlightItem';
import Carousel from '../Carousel/Carousel';
import { usePageStore } from '../Page/PageProvider';


export default function Spotlight({
  className,
  items,
}: Readonly<{
  className?: string;
  items: TvSeries[];
}>) {
  const updateBackground = usePageStore((state) => state.setBackground);
  const itemRenderer = useCallback(
    (index: number, ref: RefObject<HTMLElement>) => (
      <SpotlightItem ref={ref} index={index} item={items[index]} />
    ),
    [items],
  );

  const handleChange = useCallback(
    (index: number) => {
      const item = items[index];
      updateBackground({
        backgroundImage: item.backdropImage as string,
        backgroundColor: item.backdropColor,
      });
      const mainElement = document.querySelector('main');
      if (mainElement) {
        mainElement.style.backgroundColor = item.backdropColor;
      }
    },
    [items, updateBackground],
  );

  return (
    <Carousel
      className={className}
      itemRenderer={itemRenderer}
      itemCount={items.length}
      onChange={handleChange}
    />
  );
}
