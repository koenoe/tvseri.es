'use client';

import { useCallback } from 'react';

import { cva, cx, type VariantProps } from 'class-variance-authority';
import { motion } from 'motion/react';

export const circleButtonStyles = cva(
  'relative flex aspect-square items-center justify-center rounded-full border-2 focus:outline-none',
  {
    variants: {
      size: {
        small: ['size-8'],
        medium: ['size-10 md:size-12'],
      },
    },
    defaultVariants: {
      size: 'medium',
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
  }>) {
  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(!isActive, event);
    },
    [isActive, onClick],
  );

  return (
    <motion.button
      ref={ref}
      title={title}
      className={cx(circleButtonStyles({ className, size }))}
      disabled={isDisabled}
      whileTap="tap"
      whileHover={isActive ? 'hover-active' : 'hover-inactive'}
      onClick={handleClick}
      initial={false}
      animate={isActive ? 'active' : 'inactive'}
      variants={{
        active: {
          borderColor: 'rgba(255, 255, 255, 1)',
          color: 'rgba(255, 255, 255, 1)',
          transition: {
            duration: 0.6,
          },
        },
        inactive: {
          borderColor: 'rgba(255, 255, 255, 0.2)',
          color: 'rgba(255, 255, 255, 0.6)',
        },
        'hover-inactive': {
          borderColor: 'rgba(255, 255, 255, 0.4)',
        },
        'hover-active': {
          borderColor: 'rgba(255, 255, 255, 1)',
        },
      }}
      layout
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
          style={{
            position: 'absolute',
            left: 'calc(50% - 22px)',
            top: 'calc(50% - 22px)',
            zIndex: -1,
            overflow: 'visible',
          }}
          width="44"
          height="44"
          viewBox="0 0 26 26"
          fill="#fff"
          xmlns="http://www.w3.org/2000/svg"
        >
          <motion.circle
            key="answer-like-circle"
            initial={false}
            animate={{
              scale: isActive ? [0, 2] : 0,
              opacity: isActive ? [1, 0] : 0,
            }}
            transition={{
              duration: 0.6,
            }}
            opacity="1"
            cx="13"
            cy="13"
            r="13"
            fill="#fff"
          />
        </svg>
      )}
    </motion.button>
  );
}
