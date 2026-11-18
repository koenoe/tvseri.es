'use client';

import { useCallback, useMemo, useRef } from 'react';

import { getBackgroundImageProps } from '@/components/background/BackgroundImage';
import preloadImage, {
  isPreloaded,
} from '@/components/background/preloadImage';

import type { Slide } from './slide';

/**
 * The slides' backdrops ahead of time: `prepare` fetches and decodes one
 * (the `<img>`'s own srcset/sizes, so the preload is the file it shows);
 * `ready` says whether one can show at once. A backdrop whose preload failed
 * counts as ready: there is nothing to wait for (the `<img>` fails too), so
 * its switch doesn't hold the artwork back.
 */
export default function useBackdrops(slides: ReadonlyArray<Slide>) {
  const sources = useMemo(
    () =>
      slides.map((item) =>
        item.backdrop ? getBackgroundImageProps(item.backdrop) : null,
      ),
    [slides],
  );
  const failedRef = useRef(new Set<number>());

  const prepare = useCallback(
    (index: number) => {
      const source = sources[index];
      if (!source) {
        return Promise.resolve();
      }
      const { src, ...responsive } = source;
      return preloadImage(src, responsive).catch(() => {
        failedRef.current.add(index);
      });
    },
    [sources],
  );

  const ready = useCallback(
    (index: number) => {
      const source = sources[index];
      return (
        !source ||
        isPreloaded(source.src, source) ||
        failedRef.current.has(index)
      );
    },
    [sources],
  );

  return { prepare, ready };
}
