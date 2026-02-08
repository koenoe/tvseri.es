'use client';

import { cva, cx, type VariantProps } from 'class-variance-authority';
import { animate, motion } from 'motion/react';
import { memo, useCallback, useLayoutEffect, useRef } from 'react';

export const circleButtonStyles = cva(
  'relative flex aspect-square items-center justify-center rounded-full border-2 focus:outline-none',
  {
    defaultVariants: {
      size: 'medium',
    },
    variants: {
      size: {
        medium: ['size-10 md:size-12'],
        small: ['size-8'],
      },
    },
  },
);

export type ButtonVariantProps = VariantProps<typeof circleButtonStyles>;

function CircleButton({
  className,
  children,
  onClick,
  isActive = false,
  isDisabled,
  size,
  ref,
  title,
  initial,
}: ButtonVariantProps &
  Readonly<{
    ref?: React.Ref<HTMLButtonElement>;
    className?: string;
    children: React.ReactNode;
    onClick?: (
      value: boolean,
      event: React.MouseEvent<HTMLButtonElement>,
    ) => void;
    isActive?: boolean;
    isDisabled?: boolean;
    title?: string;
    initial?: boolean | string;
  }>) {
  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(!isActive, event);
    },
    [isActive, onClick],
  );

  // Imperatively animate the circle burst on false→true transitions.
  // The circle element stays at its final state (opacity: 0, scale: 2)
  // in the DOM. On Activity re-show, nothing triggers because
  // prevActiveRef tracks isActive — when both are true, no animation.
  const circleRef = useRef<SVGCircleElement>(null);
  const prevActiveRef = useRef(isActive);

  useLayoutEffect(() => {
    const wasActive = prevActiveRef.current;
    prevActiveRef.current = isActive;

    if (isActive && !wasActive && circleRef.current) {
      const controls = animate(
        circleRef.current,
        { opacity: [1, 0], scale: [0, 2] },
        { duration: 0.6 },
      );
      return () => controls.stop();
    }
  }, [isActive]);

  return (
    <motion.button
      animate={isActive ? 'active' : 'inactive'}
      className={cx(circleButtonStyles({ className, size }))}
      disabled={isDisabled}
      initial={initial ?? false}
      onClick={handleClick}
      ref={ref}
      title={title}
      variants={{
        active: {
          borderColor: 'rgba(255, 255, 255, 1)',
          color: 'rgba(255, 255, 255, 1)',
          transition: {
            duration: 0.6,
          },
        },
        'hover-active': {
          borderColor: 'rgba(255, 255, 255, 1)',
        },
        'hover-inactive': {
          borderColor: 'rgba(255, 255, 255, 0.4)',
        },
        inactive: {
          borderColor: 'rgba(255, 255, 255, 0.2)',
          color: 'rgba(255, 255, 255, 0.6)',
        },
      }}
      whileHover={isActive ? 'hover-active' : 'hover-inactive'}
      whileTap="tap"
    >
      <motion.div
        variants={{
          tap: { scale: 0.6 },
        }}
      >
        {children}
      </motion.div>
      {isActive && (
        <svg
          aria-hidden
          fill="#fff"
          height="44"
          style={{
            left: 'calc(50% - 22px)',
            overflow: 'visible',
            position: 'absolute',
            top: 'calc(50% - 22px)',
            zIndex: -1,
          }}
          viewBox="0 0 26 26"
          width="44"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            cx="13"
            cy="13"
            fill="#fff"
            opacity="0"
            r="13"
            ref={circleRef}
            style={{ transform: 'scale(2)' }}
          />
        </svg>
      )}
    </motion.button>
  );
}

CircleButton.displayName = 'CircleButton';

export default memo(CircleButton);
