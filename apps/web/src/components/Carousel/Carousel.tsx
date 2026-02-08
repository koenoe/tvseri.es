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
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { useDebouncedCallback } from 'use-debounce';

import getHistoryKey from '@/utils/getHistoryKey';
import CarouselDot from './CarouselDot';
import CarouselItem from './CarouselItem';
import { getCarouselIndex, isBackNavigation, setCarouselIndex } from './cache';

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
 * Read cached index synchronously during render.
 * Only restores on back navigation, returns 0 for forward navigation.
 *
 * NOTE: isBackNavigation() reads window.__navIsBack which may be stale
 * during render. The authoritative restore happens in useLayoutEffect.
 * This synchronous read is a best-effort optimization to avoid a flash
 * when it IS accurate (e.g. on initial hydration after back-nav).
 *
 * @see rerender-lazy-state-init - Lazy initialization for expensive reads
 */
function getInitialIndex(cacheKey: string): number {
  if (typeof window === 'undefined') return 0;
  if (!isBackNavigation()) return 0;
  return getCarouselIndex(cacheKey) ?? 0;
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
  /**
   * Initialize from cache synchronously using lazy initialization.
   * This may cause a hydration mismatch (server=0, client=cached), which is intentional:
   * we suppress the warning because the cached position is the correct user-facing state.
   *
   * NOTE: isBackNavigation() may be stale during render. The authoritative
   * restore happens in useLayoutEffect. This is a best-effort optimization.
   *
   * @see rerender-lazy-state-init - Pass function to useState for expensive values
   */
  const [currentIndex, setCurrentIndex] = useState(() =>
    getInitialIndex(`${restoreKey}:${getHistoryKey()}`),
  );
  const [targetIndex, setTargetIndex] = useState(currentIndex);
  const currentIndexRef = useRef(currentIndex);
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

  /**
   * Set initial x position and call onChange for restored index.
   * useEffectEvent provides stable callback that always accesses latest values.
   *
   * @see react19-no-forwardref - React 19 APIs including useEffectEvent
   */
  const onInitialize = useEffectEvent((restoredIndex: number) => {
    x.set(calculateNewX(restoredIndex));
    onChange?.(getItemIndex(restoredIndex));
  });

  // On mount / Activity show:
  // - Back-nav: restore cached index (carousel position user left it at)
  // - Forward-nav (including Activity re-show): reset to 0
  // On unmount / Activity hide:
  // - Save current index to cache for future back-nav
  //
  // History state is read here (not during render) because it's external
  // mutable state that may not yet reflect the current navigation at render time.
  useLayoutEffect(() => {
    const historyKey = getHistoryKey();
    const cacheKey = `${restoreKey}:${historyKey}`;

    if (isBackNavigation()) {
      const cached = getCarouselIndex(cacheKey) ?? 0;
      if (cached !== 0) {
        setCurrentIndex(cached);
        setTargetIndex(cached);
        onInitialize(cached);
      }
    } else {
      // Reset on forward nav — handles Activity re-show (e.g. logo click)
      // On fresh mount this is a no-op (already 0).
      setCurrentIndex(0);
      setTargetIndex(0);
      onInitialize(0);
    }

    return () => {
      if (currentIndexRef.current !== 0) {
        setCarouselIndex(cacheKey, currentIndexRef.current);
      }
    };
  }, [restoreKey]);

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

Carousel.displayName = 'Carousel';

export default memo(Carousel);
