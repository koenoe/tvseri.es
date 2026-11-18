'use client';

import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import { memo } from 'react';
import { useShallow } from 'zustand/shallow';

import type { BackgroundProps } from './Background';
import BackgroundBase, { backgroundBaseStyles } from './BackgroundBase';
import { useBackground } from './BackgroundProvider';

const LAYER = backgroundBaseStyles({ animated: true });

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

/**
 * Animated variant: crossfades to the new image when the store changes (a
 * carousel slide). On an Activity re-show BackgroundProvider sets
 * `MotionGlobalConfig.instantAnimations` first, so the sync is instant.
 */
function BackgroundDynamic({
  priority = false,
}: Pick<BackgroundProps, 'priority'>) {
  const { backgroundColor, backgroundImage } = useBackground(
    useShallow((state) => ({
      backgroundColor: state.backgroundColor,
      backgroundImage: state.backgroundImage,
    })),
  );

  return (
    <AnimatePresence initial={false}>
      <m.div
        animate="animate"
        className={LAYER}
        exit="exit"
        initial="initial"
        key={backgroundImage}
        transition={transition}
        variants={variants}
      >
        <BackgroundBase
          color={backgroundColor}
          image={backgroundImage}
          priority={priority}
        />
      </m.div>
    </AnimatePresence>
  );
}

BackgroundDynamic.displayName = 'BackgroundDynamic';

export default memo(BackgroundDynamic);
