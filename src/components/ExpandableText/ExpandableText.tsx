'use client';

import { useCallback, useState } from 'react';

import { cva } from 'class-variance-authority';

const textStyles = cva(
  'leading-loose md:!line-clamp-none md:pointer-events-none',
  {
    variants: {
      state: {
        open: ['line-clamp-none'],
        closed: ['line-clamp-3'],
      },
    },
    defaultVariants: {
      state: 'open',
    },
  },
);

export default function ExpandableText({
  className,
  children,
}: Readonly<{ className?: string; children: React.ReactNode }>) {
  const [isOpen, setIsOpen] = useState(false);
  const handleClick = useCallback(
    () => setIsOpen((previousState) => !previousState),
    [],
  );

  return (
    <p
      className={textStyles({ state: isOpen ? 'open' : 'closed', className })}
      onClick={handleClick}
    >
      {children}
    </p>
  );
}
