'use client';

import { AnimatePresence, motion } from 'motion/react';
import { memo } from 'react';
import { usePageStore } from '../Page/PageStoreProvider';
import type { Props } from './Background';
import BackgroundBase, { backgroundBaseStyles } from './BackgroundBase';

const variants = {
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  initial: { opacity: 0 },
} as const;

const transition = {
  duration: 0.5,
  ease: [0.4, 0, 0.2, 1],
  type: 'tween',
} as const;

function BackgroundDynamic({ context = 'page' }: Pick<Props, 'context'>) {
  const color = usePageStore((state) => state.backgroundColor);
  const image = usePageStore((state) => state.backgroundImage);

  return (
    <AnimatePresence initial={false}>
      <motion.div
        animate="animate"
        className={backgroundBaseStyles()}
        exit="exit"
        initial="initial"
        key={image}
        transition={transition}
        variants={variants}
      >
        <BackgroundBase color={color} context={context} image={image} />
      </motion.div>
    </AnimatePresence>
  );
}

export default memo(BackgroundDynamic);
