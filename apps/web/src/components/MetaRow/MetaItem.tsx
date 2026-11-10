import type { ComponentType, ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

/**
 * One fact in a `MetaRow`, always with a 13px line icon. Renders nothing
 * without content (null, undefined, false or ''; 0 is shown), so callers can
 * pass a missing value as is.
 * Items keep their width; the one item that may truncate with "…" opts in
 * with `shrink` (e.g. `GenreMetaItem`), so a hidden item can't change which
 * one shrinks.
 * Each item starts with a visually hidden ", " (dropped on the first one) so
 * screen readers don't run the items together. A skipped item (one that
 * renders nothing) takes its separator with it; an item hidden with CSS
 * keeps it, so it must never be the first in a row.
 */
export default function MetaItem({
  children,
  className,
  icon: Icon,
}: Readonly<{
  children?: ReactNode;
  className?: string;
  icon: ComponentType<Readonly<{ className?: string }>>;
}>) {
  if (
    children === null ||
    children === undefined ||
    children === false ||
    children === ''
  ) {
    return null;
  }

  const classes = twMerge(
    'group/meta-item inline-flex min-w-0 shrink-0 items-center gap-1.5',
    className,
  );

  return (
    <span className={classes}>
      <span className="sr-only group-first/meta-item:hidden">, </span>
      <Icon className="size-[13px] shrink-0" />
      <span className="truncate">{children}</span>
    </span>
  );
}
