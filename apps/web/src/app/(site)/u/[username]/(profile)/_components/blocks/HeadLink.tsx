import Link from 'next/link';
import type { ReactNode } from 'react';
import { chevronRightGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import cn from '@/lib/cn';

/**
 * The link at the end of a block header: "All in progress ›" in a lane,
 * "42 ›" / "Stats ›" by a section rule. Both draw the chevron at 13px.
 */
export default function HeadLink({
  children,
  className,
  href,
  label,
}: Readonly<{
  children: ReactNode;
  className?: string;
  href: string;
  /** a fuller name than the visible text ("Watchlist, 55 series"), starting with it */
  label?: string;
}>) {
  const classes = cn(
    'flex shrink-0 items-center gap-1 whitespace-nowrap text-body-sm font-medium text-white/60 transition-colors hover:text-white',
    className,
  );
  return (
    <Link aria-label={label} className={classes} href={href}>
      {children}
      <Icon glyph={chevronRightGlyph} size={13} />
    </Link>
  );
}
