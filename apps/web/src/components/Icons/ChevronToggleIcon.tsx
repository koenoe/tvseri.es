'use client';

import { motion } from 'motion/react';

const open = { rotate: 180 };
const closed = { rotate: 0 };

/** Chevron that rotates 180° when `isOpen`, for dropdown and expand toggles */
export function ChevronToggleIcon({
  className,
  isOpen,
}: Readonly<{ className?: string; isOpen: boolean }>) {
  const animate = isOpen ? open : closed;

  return (
    <motion.svg
      animate={animate}
      aria-hidden="true"
      className={className}
      fill="currentColor"
      viewBox="0 0 20 20"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        clipRule="evenodd"
        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
        fillRule="evenodd"
      />
    </motion.svg>
  );
}
