'use client';

import {
  memo,
  type ReactElement,
  type RefObject,
  useMemo,
  useRef,
} from 'react';

import { motion, type MotionValue, type PanInfo } from 'motion/react';

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

  return (
    <motion.div
      className="absolute h-full w-full transform-gpu content-visibility-auto"
      style={{
        contain: 'paint layout',
        left: `${index * 100}%`,
        x,
      }}
      drag="x"
      dragElastic={1}
      draggable
      onDragEnd={onDragEnd}
      whileDrag={{
        pointerEvents: 'none',
      }}
    >
      {child}
    </motion.div>
  );
}

export default memo(CarouselItem);
