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
  useState,
} from 'react';
import { useDebouncedCallback } from 'use-debounce';

import getHistoryKey from '@/utils/getHistoryKey';

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
  onChange?: (index: number) => void;
  restoreKey: string;
}>) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [targetIndex, setTargetIndex] = useState(0);
  const currentIndexRef = useRef(currentIndex);
  const hasRestoredRef = useRef(false);
  const cacheKeyRef = useRef(`${restoreKey}:${getHistoryKey()}`);
  const [containerRef, animate] = useAnimate();
  const x = useMotionValue(0);

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
      onChange?.(getItemIndex(index));
    },
    [animate, calculateNewX, getItemIndex, onChange, x],
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

  // Restore index from sessionStorage before paint
  // biome-ignore lint/correctness/useExhaustiveDependencies: only run once on mount
  useLayoutEffect(() => {
    if (hasRestoredRef.current) return;
    hasRestoredRef.current = true;

    const cached = sessionStorage.getItem(cacheKeyRef.current);
    if (cached) {
      sessionStorage.removeItem(cacheKeyRef.current);
      const restored = parseInt(cached, 10);
      if (restored !== 0) {
        setCurrentIndex(restored);
        setTargetIndex(restored);
        x.set(calculateNewX(restored));
        onChange?.(getItemIndex(restored));
      }
    }
  }, []);

  // Save state on unmount only (not on refresh)
  useEffect(() => {
    return () => {
      if (currentIndexRef.current !== 0) {
        sessionStorage.setItem(
          cacheKeyRef.current,
          currentIndexRef.current.toString(),
        );
      }
    };
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
