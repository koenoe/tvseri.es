'use client';

import { memo, type RefObject, useCallback, useMemo, useRef } from 'react';

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
  itemRenderer: (index: number, ref: RefObject<HTMLElement>) => JSX.Element;
}>) {
  const childRef = useRef<HTMLElement>(null);

  const child = useMemo(
    () => itemRenderer(index, childRef),
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
      className="absolute h-full w-full"
      style={{
        left: `${index * 100}%`,
        right: `${index * 100}%`,
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
