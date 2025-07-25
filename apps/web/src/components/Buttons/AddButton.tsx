'use client';

import { cva } from 'class-variance-authority';
import { motion } from 'motion/react';

import CircleButton, { type ButtonVariantProps } from './CircleButton';

const svgStyles = cva('', {
  defaultVariants: {
    size: 'medium',
  },
  variants: {
    size: {
      medium: ['size-5 md:size-6'],
      small: ['size-3 md:size-4'],
    },
  },
});

export default function AddButton({
  isActive,
  isDisabled,
  onClick,
  title,
  size,
}: ButtonVariantProps &
  Readonly<{
    isActive?: boolean;
    isDisabled?: boolean;
    onClick?: (
      value: boolean,
      event: React.MouseEvent<HTMLButtonElement>,
    ) => void;
    title?: string;
  }>) {
  return (
    <CircleButton
      isActive={isActive}
      isDisabled={isDisabled}
      onClick={onClick}
      size={size}
      title={title}
    >
      <svg
        className={svgStyles({ size })}
        viewBox="0 0 512 512"
        xmlns="http://www.w3.org/2000/svg"
      >
        {isActive ? (
          <motion.polyline
            points="416 128 192 384 96 288"
            style={{
              fill: 'none',
              stroke: 'currentColor',
              strokeLinecap: 'square',
              strokeMiterlimit: 10,
              strokeWidth: '44px',
            }}
          />
        ) : (
          <g fill="none" fillRule="evenodd" stroke="none" strokeWidth="1">
            <g
              fill="currentColor"
              id="uncollapse"
              transform="translate(64.000000, 64.000000)"
            >
              <motion.path d="M213.333333,1.42108547e-14 L213.333,170.666 L384,170.666667 L384,213.333333 L213.333,213.333 L213.333333,384 L170.666667,384 L170.666,213.333 L1.42108547e-14,213.333333 L1.42108547e-14,170.666667 L170.666,170.666 L170.666667,1.42108547e-14 L213.333333,1.42108547e-14 Z" />
            </g>
          </g>
        )}
      </svg>
    </CircleButton>
  );
}
