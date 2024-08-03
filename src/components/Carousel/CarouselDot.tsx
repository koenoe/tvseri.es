'use client';

import { memo, useCallback } from 'react';

import { cva } from 'class-variance-authority';
import { motion } from 'framer-motion';

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
      initial={false}
      animate={{
        scale: isActive ? 1.25 : 1,
        opacity: isActive ? 1 : 0.2,
      }}
      className={carouselDotStyles()}
      onClick={handleClick}
    />
  );
}

export default memo(CarouselDot);
