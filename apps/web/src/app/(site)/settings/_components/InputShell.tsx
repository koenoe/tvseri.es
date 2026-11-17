import type { ReactNode } from 'react';

import cn from '@/lib/cn';

/**
 * The dark field every settings input sits in:
 * black/25 with a 1px inner edge, 10px radius. The input inside it takes the
 * shell's focus ring (`INPUT_CLASS` leaves it out of the input itself).
 */
export default function InputShell({
  children,
  className,
}: Readonly<{ children: ReactNode; className?: string }>) {
  const classes = cn(
    'flex items-center rounded-10 bg-black/25 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.1)] focus-within:shadow-[inset_0_0_0_1px_rgb(255_255_255/0.45)]',
    className,
  );
  return <span className={classes}>{children}</span>;
}

/** The bare input inside an `InputShell`: 16px on phones so iOS doesn't zoom. */
export const INPUT_CLASS =
  'min-w-0 flex-1 bg-transparent text-body text-white outline-hidden placeholder:text-white/60 md:text-body-sm';
