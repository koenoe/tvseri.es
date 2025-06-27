'use client';

import { cva, cx, type VariantProps } from 'class-variance-authority';
import { motion } from 'motion/react';
import { useCallback } from 'react';

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

export default function CircleButton({
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

  return (
    <motion.button
      animate={isActive ? 'active' : 'inactive'}
      className={cx(circleButtonStyles({ className, size }))}
      disabled={isDisabled}
      initial={initial ?? false}
      layout
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
          <motion.circle
            animate={{
              opacity: isActive ? [1, 0] : 0,
              scale: isActive ? [0, 2] : 0,
            }}
            cx="13"
            cy="13"
            fill="#fff"
            initial={false}
            key="answer-like-circle"
            opacity="1"
            r="13"
            transition={{
              duration: 0.6,
            }}
          />
        </svg>
      )}
    </motion.button>
  );
}
