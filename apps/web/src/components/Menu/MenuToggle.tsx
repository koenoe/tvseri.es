'use client';

import { cva } from 'class-variance-authority';
import { motion, useAnimation } from 'motion/react';
import { memo, useCallback, useEffect, useRef } from 'react';

import useMatchMedia from '@/hooks/useMatchMedia';
import getMousePosition from '@/utils/getMousePosition';

import { useHeaderStore } from '../Header/HeaderStoreProvider';

const topPathVariants = {
  closed: { d: 'M 0 9.5 L 24 9.5' },
  open: { d: 'M 3.06061 2.99999 L 21.0606 21' },
};

const bottomPathVariants = {
  closed: { d: 'M 0 15.5 L 15 15.5' },
  extended: { d: 'M 0 15.5 L 24 15.5' },
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

function MenuToggleComponent({
  onClick,
}: Readonly<{
  onClick?: () => void;
}>) {
  const isOpen = useHeaderStore((state) => state.menuOpen);
  const isMobile = useMatchMedia('(max-width: 768px)');
  const buttonRef = useRef<HTMLButtonElement>(null);
  const topPathControls = useAnimation();
  const bottomPathControls = useAnimation();
  const prevIsOpen = useRef(isOpen);

  useEffect(() => {
    // Skip if state hasn't changed (including initial mount)
    if (prevIsOpen.current === isOpen) return;
    prevIsOpen.current = isOpen;

    const animate = async () => {
      if (isOpen) {
        // Opening: bottom extends first, then both morph to X
        await bottomPathControls.start(bottomPathVariants.extended);
        await Promise.all([
          topPathControls.start(topPathVariants.open),
          bottomPathControls.start(bottomPathVariants.open),
        ]);
      } else {
        // Closing: both morph back, then bottom shrinks
        await Promise.all([
          topPathControls.start(topPathVariants.closed),
          bottomPathControls.start(bottomPathVariants.extended),
        ]);
        await bottomPathControls.start(bottomPathVariants.closed);
      }
    };

    void animate();
  }, [isOpen, topPathControls, bottomPathControls]);

  // Reset position when menu closes (mobile only)
  useEffect(() => {
    if (!isOpen) {
      buttonRef.current?.style.removeProperty('left');
      buttonRef.current?.style.removeProperty('top');
    }
  }, [isOpen]);

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      // Only apply mouse positioning on mobile
      if (!isOpen && isMobile) {
        const { x, y } = getMousePosition(event);
        buttonRef.current?.style.setProperty('left', `${x}px`);
        buttonRef.current?.style.setProperty('top', `${y}px`);
      }

      onClick?.();
    },
    [isOpen, isMobile, onClick],
  );

  const animationState = isOpen ? 'open' : 'closed';

  return (
    <button
      className={menuToggleStyles({ state: animationState })}
      onClick={handleClick}
      ref={buttonRef}
    >
      <div className="size-[22px] md:size-[24px]">
        <svg className="h-full w-full" viewBox="0 0 24 24">
          <motion.path
            animate={topPathControls}
            d={topPathVariants.closed.d}
            stroke="#fff"
            strokeWidth={2.5}
            transition={{ duration: 0.2 }}
          />
          <motion.path
            animate={bottomPathControls}
            d={bottomPathVariants.closed.d}
            stroke="#fff"
            strokeWidth={2.5}
            transition={{ duration: 0.2 }}
          />
        </svg>
      </div>
    </button>
  );
}

MenuToggleComponent.displayName = 'MenuToggle';

const MenuToggle = memo(MenuToggleComponent);

export default MenuToggle;
