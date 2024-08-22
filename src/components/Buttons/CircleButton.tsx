'use client';

import { useCallback, useState } from 'react';

import { cva } from 'class-variance-authority';
import { motion } from 'framer-motion';

export const circleButtonStyles = cva(
  'relative flex aspect-square h-12 w-12 items-center justify-center rounded-full border-2 focus:outline-none',
);

export default function CircleButton({
  children,
  onClick,
  isActive: isActiveFromProps = false,
}: Readonly<{
  children: React.ReactNode;
  onClick?: (value: boolean) => void;
  isActive?: boolean;
}>) {
  const [isActive, setIsActive] = useState(isActiveFromProps);
  const handleClick = useCallback(() => {
    setIsActive(!isActive);
    onClick?.(!isActive);
  }, [isActive, onClick]);

  return (
    <motion.button
      className={circleButtonStyles()}
      whileTap="tap"
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