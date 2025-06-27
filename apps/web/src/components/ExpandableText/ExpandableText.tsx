'use client';

import { cva } from 'class-variance-authority';
import { useCallback, useState } from 'react';

const textStyles = cva('leading-loose', {
  defaultVariants: {
    state: 'closed',
  },
  variants: {
    state: {
      closed: ['line-clamp-3 xl:line-clamp-5'],
      open: ['line-clamp-none'],
    },
  },
});

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
    <div
      className={textStyles({ className, state: isOpen ? 'open' : 'closed' })}
      onClick={handleClick}
    >
      {children}
    </div>
  );
}
