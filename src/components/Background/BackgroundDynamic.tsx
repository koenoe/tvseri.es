'use client';

import { memo } from 'react';

import { AnimatePresence, motion } from 'framer-motion';

import { type Props } from './Background';
import BackgroundBase, { backgroundBaseStyles } from './BackgroundBase';
import { usePageStore } from '../Page/PageStoreProvider';

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

function BackgroundDynamic({ context = 'page' }: Pick<Props, 'context'>) {
  const color = usePageStore((state) => state.backgroundColor);
  const image = usePageStore((state) => state.backgroundImage);

  return (
    <AnimatePresence initial={false}>
      <motion.div
        key={image}
        className={backgroundBaseStyles()}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={transition}
      >
        <BackgroundBase color={color} image={image} context={context} />
      </motion.div>
    </AnimatePresence>
  );
}

export default memo(BackgroundDynamic);
