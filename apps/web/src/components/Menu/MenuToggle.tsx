'use client';

import { cva } from 'class-variance-authority';
import { motion, useAnimation } from 'motion/react';
import { forwardRef, useCallback, useImperativeHandle, useState } from 'react';

const firstPathVariants = {
  closed: { d: 'M 0 9.5 L 24 9.5' },
  open: { d: 'M 3.06061 2.99999 L 21.0606 21' },
};

const secondPathVariants = {
  closed: { d: 'M 0 15.5 L 15 15.5' },
  moving: { d: 'M 0 15.5 L 24 15.5' },
  open: { d: 'M 3.00006 21.0607 L 21 3.06064' },
};

const menuToggleStyles = cva('z-50 cursor-pointer md:z-10', {
  defaultVariants: {
    state: 'closed',
  },
  variants: {
    state: {
      closed: ['absolute right-0'],
      open: ['fixed md:absolute right-[2rem] md:right-0'],
    },
  },
});

export type MenuToggleHandle = Readonly<{
  close: () => void;
}>;

const MenuToggle = forwardRef<
  MenuToggleHandle,
  Readonly<{
    onClick?: (isOpen: boolean) => void;
  }>
>(({ onClick }, ref) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const path01Controls = useAnimation();
  const path02Controls = useAnimation();

  const animateSvg = useCallback(
    async (open: boolean) => {
      if (open) {
        await path02Controls.start(secondPathVariants.moving);
        path01Controls.start(firstPathVariants.open);
        path02Controls.start(secondPathVariants.open);
      } else {
        path01Controls.start(firstPathVariants.closed);
        await path02Controls.start(secondPathVariants.moving);
        path02Controls.start(secondPathVariants.closed);
      }
    },
    [path01Controls, path02Controls],
  );

  const handleClick = useCallback(() => {
    onClick?.(!isOpen);
    setIsOpen((prev) => {
      void animateSvg(!prev);
      return !prev;
    });
  }, [animateSvg, isOpen, onClick]);

  useImperativeHandle(
    ref,
    () => ({
      close: () => {
        setIsOpen(false);
        void animateSvg(false);
      },
    }),
    [animateSvg],
  );

  return (
    <button
      className={menuToggleStyles({ state: isOpen ? 'open' : 'closed' })}
      onClick={handleClick}
    >
      <svg height="24" viewBox="0 0 24 24" width="24">
        <motion.path
          {...firstPathVariants.closed}
          animate={path01Controls}
          stroke="#fff"
          strokeWidth={2.5}
          transition={{ duration: 0.2 }}
        />
        <motion.path
          {...secondPathVariants.closed}
          animate={path02Controls}
          stroke="#fff"
          strokeWidth={2.5}
          transition={{ duration: 0.2 }}
        />
      </svg>
    </button>
  );
});

MenuToggle.displayName = 'MenuToggle';

export default MenuToggle;
