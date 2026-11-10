import type { ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

/**
 * A single line of facts (dates, runtime, seasons, genres) separated by gaps
 * only, never dots, so a skipped item leaves nothing behind. Falsy children
 * render nothing. The line height is `--meta-row-height` (globals.css),
 * shared with the skeleton bars. `relative` keeps the row above absolutely positioned
 * backdrops in a static parent (e.g. the In progress card), as the old
 * `opacity-60` did; it also contains the items' `sr-only` separators.
 */
export default function MetaRow({
  children,
  className,
}: Readonly<{
  children: ReactNode;
  className?: string;
}>) {
  const classes = twMerge(
    'relative flex min-w-0 items-center gap-4 whitespace-nowrap text-[13px] leading-[--meta-row-height] text-meta',
    className,
  );

  return <div className={classes}>{children}</div>;
}
