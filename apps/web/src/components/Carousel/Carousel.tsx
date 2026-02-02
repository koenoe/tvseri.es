'use client';

// Note: heavily inspired by https://codesandbox.io/s/infinite-carousel-with-framer-motion-fk0f0

import { cva, cx } from 'class-variance-authority';
import {
  type Easing,
  type PanInfo,
  useAnimate,
  useMotionValue,
} from 'motion/react';
import {
  memo,
  type ReactElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
} from 'react';
import { useDebouncedCallback } from 'use-debounce';

import createUseRestorableState from '@/hooks/createUseRestorableState';

import CarouselDot from './CarouselDot';
import CarouselItem from './CarouselItem';

const transition = {
  duration: 0.5,
  ease: [0.4, 0, 0.2, 1] as Easing,
  type: 'tween',
} as const;

export const carouselStyles = cva(
  'relative flex aspect-video h-[calc(95vh-16rem)] w-full overflow-hidden shadow-xl scrollbar-hide md:h-[calc(80vh-8rem)] transform-gpu',
);

// Calculate visible range based on current position and animation target
// Renders items between current position and target for smooth transitions
function getVisibleRange(
  currentIndex: number,
  targetIndex: number,
  itemCount: number,
): number[] {
  const currentItemIndex = ((currentIndex % itemCount) + itemCount) % itemCount;

  // If animating, we need to render all items between current and target
  if (currentIndex !== targetIndex) {
    const minIndex = Math.min(currentIndex, targetIndex);
    const maxIndex = Math.max(currentIndex, targetIndex);
    return Array.from(
      { length: maxIndex - minIndex + 1 },
      (_, i) => minIndex + i,
    );
  }

  // Not animating: only render prev, current, next
  const prev = currentItemIndex === 0 ? -1 : -currentItemIndex;
  const next =
    currentItemIndex === itemCount - 1 ? 2 : itemCount - currentItemIndex;

  const start = Math.max(prev, -1);
  const end = Math.min(next, 2);

  return Array.from(
    { length: end - start },
    (_, i) => currentIndex + start + i,
  );
}

/**
 * In-memory cache for carousel index state.
 *
 * Following js-cache-function-results pattern: module-level Map provides
 * O(1) lookups for back-navigation restoration.
 *
 * Why in-memory (not sessionStorage)?
 * - Refresh: Map clears → carousel starts at index 0 (correct behavior)
 * - Back navigation: Same historyKey → cache hit → instant restore
 * - Forward navigation: New historyKey → cache miss → index 0
 */
const useRestorableIndex = createUseRestorableState<number>();

function Carousel({
  className,
  itemCount,
  itemRenderer,
  onChange,
  restoreKey,
}: Readonly<{
  className?: string;
  itemCount: number;
  itemRenderer: (index: number) => ReactElement;
  onChange?: (index: number, isUserInteraction: boolean) => void;
  restoreKey: string;
}>) {
  const [currentIndex, setCurrentIndex] = useRestorableIndex(restoreKey, 0);
  const [targetIndex, setTargetIndex] = useRestorableIndex(
    `${restoreKey}:target`,
    0,
  );
  const currentIndexRef = useRef(currentIndex);
  const [containerRef, animate] = useAnimate();
  const x = useMotionValue(0);

  // Refs for mount effect - following advanced-use-latest pattern
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const itemCountRef = useRef(itemCount);
  itemCountRef.current = itemCount;

  // Stable item index calculation
  const getItemIndex = useCallback(
    (index: number) => ((index % itemCount) + itemCount) % itemCount,
    [itemCount],
  );

  const calculateNewX = useCallback(
    (index: number) => -index * (containerRef.current?.clientWidth || 0),
    [containerRef],
  );

  const updateCurrentIndex = useCallback(
    (index: number) => {
      setTargetIndex(index);
      animate(x, calculateNewX(index), transition).then(() => {
        setCurrentIndex(index);
      });
      onChange?.(getItemIndex(index), true);
    },
    [
      animate,
      calculateNewX,
      getItemIndex,
      onChange,
      setCurrentIndex,
      setTargetIndex,
      x,
    ],
  );

  const handleDotClick = useCallback(
    (itemIndex: number) => {
      const baseIndex = Math.floor(currentIndex / itemCount) * itemCount;
      updateCurrentIndex(baseIndex + itemIndex);
    },
    [currentIndex, itemCount, updateCurrentIndex],
  );

  const handleDragEnd = useCallback(
    (_event: Event, { offset, velocity }: PanInfo) => {
      // Ignore if vertical swipe
      if (Math.abs(velocity.y) > Math.abs(velocity.x)) {
        animate(x, calculateNewX(currentIndex), transition);
        return;
      }

      const threshold = (containerRef.current?.clientWidth || 0) / 4;

      if (offset.x > threshold) {
        updateCurrentIndex(currentIndex - 1);
      } else if (offset.x < -threshold) {
        updateCurrentIndex(currentIndex + 1);
      } else {
        animate(x, calculateNewX(currentIndex), transition);
      }
    },
    [animate, calculateNewX, containerRef, currentIndex, updateCurrentIndex, x],
  );

  const handleItemRenderer = useCallback(
    (index: number) => itemRenderer(getItemIndex(index)),
    [getItemIndex, itemRenderer],
  );

  const handleResize = useDebouncedCallback(() => {
    animate(x, calculateNewX(currentIndex), transition);
  }, 100);

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  // Sync x position on mount before paint (restored index may be non-zero)
  useLayoutEffect(() => {
    const width = containerRef.current?.clientWidth || 0;
    x.set(-currentIndexRef.current * width);
  }, [containerRef, x]);

  // Notify parent of restored index (after mount, non-blocking)
  useEffect(() => {
    const index = currentIndexRef.current;
    if (index !== 0) {
      const itemIndex =
        ((index % itemCountRef.current) + itemCountRef.current) %
        itemCountRef.current;
      onChangeRef.current?.(itemIndex, false);
    }
  }, []);

  const visibleRange = getVisibleRange(currentIndex, targetIndex, itemCount);

  return (
    <div className={cx('container relative', className)}>
      <div className={carouselStyles()} ref={containerRef}>
        {visibleRange.map((index) => (
          <CarouselItem
            index={index}
            itemRenderer={handleItemRenderer}
            key={index}
            onDragEnd={handleDragEnd}
            x={x}
          />
        ))}
      </div>
      <div className="mt-6 flex w-full items-center justify-center gap-2.5">
        {Array.from({ length: itemCount }, (_, i) => (
          <CarouselDot
            index={i}
            isActive={i === getItemIndex(targetIndex)}
            key={i}
            onClick={handleDotClick}
          />
        ))}
      </div>
    </div>
  );
}

export default memo(Carousel);
