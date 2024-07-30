'use client';

import {
  memo,
  useCallback,
  useState,
  useEffect,
  useMemo,
  type RefObject,
} from 'react';
import { cva } from 'class-variance-authority';
import {
  Easing,
  type PanInfo,
  useAnimate,
  useMotionValue,
} from 'framer-motion';
import CarouselItem from './CarouselItem';

const transition = {
  type: 'tween',
  ease: [0.4, 0, 0.2, 1] as Easing,
  duration: 0.5,
} as const;

const dot = cva('h-3 w-3 rounded-full cursor-pointer', {
  variants: {
    state: {
      active: 'bg-white',
      inactive: 'bg-white/20 backdrop-blur-2xl',
    },
  },
  defaultVariants: {
    state: 'inactive',
  },
});

function Carousel({
  itemCount,
  itemRenderer,
  onChange,
}: Readonly<{
  itemCount: number;
  itemRenderer: (index: number, ref: RefObject<HTMLElement>) => JSX.Element;
  onChange?: (index: number) => void;
}>) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [containerRef, animate] = useAnimate();
  const x = useMotionValue(0);

  const range = useMemo(() => {
    const halfRange = Math.floor(itemCount / 2);
    return Array.from({ length: itemCount + 1 }, (_, i) => i - halfRange);
  }, [itemCount]);

  const calculateItemIndex = useCallback(
    (index: number) => {
      const modulo = index % itemCount;
      return modulo < 0 ? itemCount + modulo : modulo;
    },
    [itemCount],
  );

  const updateCurrentIndex = useCallback(
    (index: number) => {
      setCurrentIndex(index);
      if (onChange) {
        onChange(calculateItemIndex(index));
      }
    },
    [calculateItemIndex, onChange],
  );

  const calculateNewX = useCallback(
    (index: number) => -index * (containerRef.current?.clientWidth || 0),
    [containerRef],
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
    (index: number, ref: any) => {
      return itemRenderer(calculateItemIndex(index), ref);
    },
    [calculateItemIndex, itemRenderer],
  );

  const currentItemIndex = useMemo(
    () => calculateItemIndex(currentIndex),
    [calculateItemIndex, currentIndex],
  );

  useEffect(() => {
    const controls = animate(x, calculateNewX(currentIndex), transition);

    return controls.stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex]);

  return (
    <div className="container relative">
      <div
        className="relative flex aspect-video h-[calc(95vh-16rem)] w-full overflow-hidden shadow-2xl scrollbar-hide md:h-[calc(75vh-8rem)]"
        ref={containerRef}
      >
        {range.map((i) => {
          return (
            <CarouselItem
              key={i + currentIndex}
              x={x}
              onDragEnd={handleDragEnd}
              index={i + currentIndex}
              itemRenderer={handleItemRenderer}
            />
          );
        })}
      </div>
      <div className="mt-6 flex w-full items-center justify-center gap-2">
        {Array.from({ length: itemCount }).map((_, i) => (
          <div
            key={i}
            className={dot({
              state: currentItemIndex === i ? 'active' : 'inactive',
            })}
            onClick={() => handleDotClick(i)}
          />
        ))}
      </div>
    </div>
  );
}

export default memo(Carousel);
