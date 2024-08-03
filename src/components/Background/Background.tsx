'use client';

import { memo, useMemo } from 'react';

import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';

import hexToRgb from '@/utils/hexToRgb';

import { usePageStore } from '../Page/PageProvider';

const variants = {
  initial: {
    opacity: 0,
  },
  animate: {
    opacity: 1,
  },
  exit: {
    opacity: 0,
  },
};

const transition = {
  type: 'tween',
  ease: [0.4, 0, 0.2, 1],
  duration: 0.5,
};

function Background() {
  const color = usePageStore((state) => state.backgroundColor);
  const image = usePageStore((state) => state.backgroundImage);

  const rgbForRgba = useMemo(() => {
    const [r, g, b] = hexToRgb(color);
    return `${r},${g},${b}`;
  }, [color]);

  return (
    <AnimatePresence initial={false}>
      <motion.div
        key={image}
        className="absolute inset-0 z-0 transform-gpu"
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={transition}
      >
        <Image
          className="object-cover opacity-30"
          src={image}
          alt=""
          priority
          fill
          sizes="100vw"
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(rgba(${rgbForRgba}, 0) 0%, rgba(${rgbForRgba}, 1) 100%)`,
          }}
        />
        <div
          className="absolute bottom-0 left-0 h-1/5 w-full"
          style={{
            backgroundImage: `linear-gradient(to top, ${color}, ${color} 50%, transparent)`,
          }}
        />
      </motion.div>
    </AnimatePresence>
  );
}

export default memo(Background);
