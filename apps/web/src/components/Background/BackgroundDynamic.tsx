'use client';

import { AnimatePresence, motion } from 'motion/react';
import { memo } from 'react';
import { useShallow } from 'zustand/shallow';

import type { Props } from './Background';
import BackgroundBase, { backgroundBaseStyles } from './BackgroundBase';
import { useBackground } from './BackgroundProvider';

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
 * Animated background variant. Crossfades between images via AnimatePresence
 * when the Zustand store updates (e.g. carousel slide change in Spotlight).
 *
 * On Activity re-show, BackgroundProvider sets MotionGlobalConfig.instantAnimations
 * before updating the store, which makes the crossfade instant (duration: 0).
 */
function BackgroundDynamic({
  context = 'page',
  priority = false,
}: Pick<Props, 'context'> & { priority?: boolean }) {
  const { backgroundColor, backgroundImage } = useBackground(
    useShallow((state) => ({
      backgroundColor: state.backgroundColor,
      backgroundImage: state.backgroundImage,
    })),
  );

  return (
    <AnimatePresence initial={false}>
      <motion.div
        animate="animate"
        className={backgroundBaseStyles()}
        exit="exit"
        initial="initial"
        key={backgroundImage}
        transition={transition}
        variants={variants}
      >
        <BackgroundBase
          color={backgroundColor}
          context={context}
          image={backgroundImage}
          priority={priority}
        />
      </motion.div>
    </AnimatePresence>
  );
}

BackgroundDynamic.displayName = 'BackgroundDynamic';

export default memo(BackgroundDynamic);
