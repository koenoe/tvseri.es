'use client';

// Note: heavily inspired by https://codesandbox.io/s/infinite-carousel-with-framer-motion-fk0f0

import {
  memo,
  useCallback,
  useState,
  useMemo,
  type RefObject,
  useEffect,
  useRef,
  type ReactElement,
} from 'react';

import { cx, cva } from 'class-variance-authority';
import {
  type Easing,
  type PanInfo,
  useAnimate,
  useMotionValue,
} from 'framer-motion';

import getHistoryKey from '@/utils/getHistoryKey';

import CarouselDot from './CarouselDot';
import CarouselItem from './CarouselItem';

const transition = {
  type: 'tween',
  ease: [0.4, 0, 0.2, 1] as Easing,
  duration: 0.5,
} as const;

export const carouselStyles = cva(
  'relative flex aspect-video h-[calc(95vh-16rem)] w-full overflow-hidden shadow-xl scrollbar-hide md:h-[calc(80vh-8rem)] transform-gpu',
);

function Carousel({
  className,
  itemCount,
  itemRenderer,
  onChange,
  restoreKey,
}: Readonly<{
  className?: string;
  itemCount: number;
  itemRenderer: (
    index: number,
    ref: RefObject<HTMLAnchorElement>,
  ) => ReactElement;
  onChange?: (index: number) => void;
  restoreKey: string;
}>) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentIndexRef = useRef(currentIndex);
  const [containerRef, animate] = useAnimate();
  const x = useMotionValue(0);

  const calculateItemIndex = useCallback(
    (index: number) => {
      const modulo = index % itemCount;
      return modulo < 0 ? itemCount + modulo : modulo;
    },
    [itemCount],
  );

  const calculateNewX = useCallback(
    (index: number) => -index * (containerRef.current?.clientWidth || 0),
    [containerRef],
  );

  const updateCurrentIndex = useCallback(
    (index: number) => {
      animate(x, calculateNewX(index), transition);
      setCurrentIndex(index);
      if (onChange) {
        onChange(calculateItemIndex(index));
      }
    },
    [animate, calculateItemIndex, calculateNewX, onChange, x],
  );

  const handleDotClick = useCallback(
    (itemIndex: number) => {
      const baseIndex = Math.floor(currentIndex / itemCount) * itemCount;
      const newIndex = baseIndex + itemIndex;
      updateCurrentIndex(newIndex);
    },
    [currentIndex, itemCount, updateCurrentIndex],
  );

  const handleDragEnd = useCallback(
    (event: Event, dragProps: PanInfo) => {
      const containerWidth = containerRef.current?.clientWidth || 0;
      const offsetTreshold = containerWidth / 4;
      const { offset, velocity } = dragProps;

      if (Math.abs(velocity.y) > Math.abs(velocity.x)) {
        animate(x, calculateNewX(currentIndex), transition);
        return;
      }

      if (offset.x > offsetTreshold) {
        updateCurrentIndex(currentIndex - 1);
      } else if (offset.x < -offsetTreshold) {
        updateCurrentIndex(currentIndex + 1);
      } else {
        animate(x, calculateNewX(currentIndex), transition);
      }
    },
    [animate, calculateNewX, containerRef, currentIndex, updateCurrentIndex, x],
  );

  const handleItemRenderer = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (index: number, ref: any) => itemRenderer(calculateItemIndex(index), ref),
    [calculateItemIndex, itemRenderer],
  );

  const currentItemIndex = useMemo(
    () => calculateItemIndex(currentIndex),
    [calculateItemIndex, currentIndex],
  );

  const getRange = useCallback(() => {
    let rangeStart, rangeEnd;

    if (currentItemIndex === 0) {
      rangeStart = -1;
      rangeEnd = itemCount - currentItemIndex;
    } else if (currentItemIndex === itemCount - 1) {
      rangeStart = -currentItemIndex;
      rangeEnd = 2;
    } else {
      rangeStart = -currentItemIndex;
      rangeEnd = Math.min(itemCount - currentItemIndex, itemCount);
    }

    return Array.from(
      { length: rangeEnd - rangeStart },
      (_, i) => rangeStart + i,
    );
  }, [itemCount, currentItemIndex]);

  const handleResize = useCallback(() => {
    return updateCurrentIndex(currentIndex);
  }, [currentIndex, updateCurrentIndex]);

  useEffect(() => {
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [handleResize]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    const cacheKey = `${restoreKey}:${getHistoryKey()}`;
    const cachedCurrentIndex = sessionStorage.getItem(cacheKey);

    if (cachedCurrentIndex) {
      sessionStorage.removeItem(cacheKey);

      const newIndexFromCache = parseInt(cachedCurrentIndex, 10);
      const newX = calculateNewX(newIndexFromCache);

      setCurrentIndex(newIndexFromCache);
      x.set(newX);
    }

    return () => {
      if (currentIndexRef.current !== 0) {
        sessionStorage.setItem(cacheKey, currentIndexRef.current.toString());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={cx('container relative', className)}>
      <div className={carouselStyles()} ref={containerRef}>
        {getRange().map((i) => {
          return (
            <CarouselItem
              key={i + currentIndex}
              index={i + currentIndex}
              itemRenderer={handleItemRenderer}
              onDragEnd={handleDragEnd}
              x={x}
            />
          );
        })}
      </div>
      <div className="mt-6 flex w-full items-center justify-center gap-2.5">
        {Array.from({ length: itemCount }).map((_, i) => (
          <CarouselDot
            key={i}
            index={i}
            isActive={i === currentItemIndex}
            onClick={handleDotClick}
          />
        ))}
      </div>
    </div>
  );
}

export default memo(Carousel);
