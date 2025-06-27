'use client';

import { cva } from 'class-variance-authority';
import { motion } from 'motion/react';
import { memo, useCallback } from 'react';

export const carouselDotStyles = cva(
  'size-2.5 cursor-pointer rounded-full bg-white',
);

function CarouselDot({
  isActive = false,
  index,
  onClick,
}: Readonly<{
  isActive?: boolean;
  index: number;
  onClick?: (index: number) => void;
}>) {
  const handleClick = useCallback(() => {
    onClick?.(index);
  }, [index, onClick]);

  return (
    <motion.div
      animate={{
        opacity: isActive ? 1 : 0.2,
        scale: isActive ? 1.25 : 1,
      }}
      className={carouselDotStyles()}
      initial={false}
      onClick={handleClick}
    />
  );
}

export default memo(CarouselDot);
