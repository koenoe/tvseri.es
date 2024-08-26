'use client';

import { memo, useState } from 'react';

import { cx } from 'class-variance-authority';
import { AnimatePresence, motion } from 'framer-motion';

import getMousePosition from '@/utils/getMousePosition';

import DropdownContainer, {
  type Position,
} from '../Dropdown/DropdownContainer';

function DropdownSelect({
  buttonClassName,
  children,
  className,
  label,
  offset = { x: 0, y: 0 },
}: Readonly<{
  buttonClassName?: string;
  children: React.ReactNode;
  className?: string;
  label: string;
  offset?: Position;
}>) {
  const [position, setPosition] = useState<Position | null>(null);

  return (
    <div className={cx('relative z-10', className)}>
      <div
        className={cx(
          'flex cursor-pointer items-center gap-3 text-2xl font-medium',
          buttonClassName,
        )}
        onClick={(event: React.MouseEvent<HTMLDivElement>) => {
          const { x, y } = getMousePosition(event);
          setPosition((prevPosition) =>
            prevPosition ? null : { x: x + offset.x, y: y + offset.y },
          );
        }}
      >
        <span>{label}</span>
        <motion.svg
          className="h-6 w-6"
          viewBox="0 0 20 20"
          fill="currentColor"
          animate={{
            rotate: position ? 180 : 0,
          }}
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </motion.svg>
      </div>
      <AnimatePresence>
        {position && (
          <DropdownContainer
            key="dropdown-select"
            position={position}
            onOutsideClick={() => setPosition(null)}
          >
            {children}
          </DropdownContainer>
        )}
      </AnimatePresence>
    </div>
  );
}

export default memo(DropdownSelect);
