'use client';

import { memo } from 'react';

import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';

import useRgbString from '@/hooks/useRgbString';

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

export type BackgroundVariant = 'page' | 'spotlight';

function Background({
  variant = 'page',
}: Readonly<{ variant: BackgroundVariant }>) {
  const color = usePageStore((state) => state.backgroundColor);
  const image = usePageStore((state) => state.backgroundImage);
  const rgbString = useRgbString(color);

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
          className="object-cover"
          src={image}
          alt=""
          priority
          fill
          sizes="100vw"
          style={{
            opacity: variant === 'spotlight' ? 0.3 : 1,
          }}
        />

        {variant === 'page' && (
          <div
            className="absolute inset-0 opacity-70"
            style={{
              backgroundImage: `linear-gradient(270deg, rgba(${rgbString}, 0) 0%, rgba(${rgbString}, 0.9) 50%, rgba(${rgbString}, 1) 100%)`,
            }}
          />
        )}

        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(rgba(${rgbString}, 0) 0%, rgba(${rgbString}, 1) 100%)`,
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
