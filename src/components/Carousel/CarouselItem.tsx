'use client';

import {
  memo,
  type ReactElement,
  type RefObject,
  useCallback,
  useMemo,
  useRef,
} from 'react';

import { motion, type MotionValue, type PanInfo } from 'framer-motion';

function CarouselItem({
  index,
  x,
  onDragEnd,
  itemRenderer,
}: Readonly<{
  index: number;
  x: MotionValue;
  onDragEnd: (
    event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) => void;
  itemRenderer: (index: number, ref: RefObject<HTMLElement>) => ReactElement;
}>) {
  const childRef = useRef<HTMLElement>(null);

  const child = useMemo(
    () => itemRenderer(index, childRef as RefObject<HTMLElement>),
    [index, itemRenderer],
  );

  const handleDragStart = useCallback(() => {
    if (childRef.current) {
      childRef.current.style.pointerEvents = 'none';
    }
  }, []);

  const handleDragEnd = useCallback(
    (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (childRef.current) {
        childRef.current.style.pointerEvents = 'auto';
      }
      onDragEnd(event, info);
    },
    [onDragEnd],
  );

  return (
    <motion.div
      className="content-visibility-auto absolute h-full w-full transform-gpu"
      style={{
        contain: 'paint layout',
        left: `${index * 100}%`,
        x,
      }}
      drag="x"
      dragElastic={1}
      draggable
      onDragEnd={handleDragEnd}
      onDragStart={handleDragStart}
    >
      {child}
    </motion.div>
  );
}

export default memo(CarouselItem);
