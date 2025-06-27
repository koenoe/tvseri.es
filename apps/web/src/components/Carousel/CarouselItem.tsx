'use client';

import { type MotionValue, motion, type PanInfo } from 'motion/react';
import { memo, type ReactElement } from 'react';

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
  itemRenderer: (index: number) => ReactElement;
}>) {
  return (
    <motion.div
      className="content-visibility-auto absolute h-full w-full transform-gpu"
      drag="x"
      dragElastic={1}
      draggable
      onDragEnd={onDragEnd}
      style={{
        contain: 'paint layout',
        left: `${index * 100}%`,
        x,
      }}
      whileDrag={{
        pointerEvents: 'none',
      }}
    >
      {itemRenderer(index)}
    </motion.div>
  );
}

export default memo(CarouselItem);
