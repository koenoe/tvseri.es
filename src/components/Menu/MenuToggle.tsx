'use client';

import { useCallback } from 'react';

import { cva } from 'class-variance-authority';
import { motion, useAnimation, useCycle } from 'framer-motion';

const firstPathVariants = {
  open: { d: 'M 3.06061 2.99999 L 21.0606 21' },
  closed: { d: 'M 0 9.5 L 24 9.5' },
};

const secondPathVariants = {
  open: { d: 'M 3.00006 21.0607 L 21 3.06064' },
  moving: { d: 'M 0 15.5 L 24 15.5' },
  closed: { d: 'M 0 15.5 L 15 15.5' },
};

const menuToggleStyles = cva('z-50 cursor-pointer md:z-10', {
  variants: {
    state: {
      open: ['fixed md:absolute right-[2rem] md:right-0'],
      closed: ['absolute right-0'],
    },
  },
  defaultVariants: {
    state: 'closed',
  },
});

export default function MenuToggle({
  onClick,
}: Readonly<{
  onClick?: (isOpen: boolean) => void;
  spacing?: number;
  width?: number;
}>) {
  const [isOpen, toggleOpen] = useCycle(false, true);
  const path01Controls = useAnimation();
  const path02Controls = useAnimation();

  const handleClick = useCallback(async () => {
    toggleOpen();
    onClick?.(isOpen);

    if (!isOpen) {
      await path02Controls.start(secondPathVariants.moving);
      path01Controls.start(firstPathVariants.open);
      path02Controls.start(secondPathVariants.open);
    } else {
      path01Controls.start(firstPathVariants.closed);
      await path02Controls.start(secondPathVariants.moving);
      path02Controls.start(secondPathVariants.closed);
    }
  }, [isOpen, onClick, path01Controls, path02Controls, toggleOpen]);

  return (
    <button
      onClick={handleClick}
      className={menuToggleStyles({ state: isOpen ? 'open' : 'closed' })}
    >
      <svg width="24" height="24" viewBox="0 0 24 24">
        <motion.path
          {...firstPathVariants.closed}
          animate={path01Controls}
          transition={{ duration: 0.2 }}
          stroke="#fff"
          strokeWidth={2.5}
        />
        <motion.path
          {...secondPathVariants.closed}
          animate={path02Controls}
          transition={{ duration: 0.2 }}
          stroke="#fff"
          strokeWidth={2.5}
        />
      </svg>
    </button>
  );
}
