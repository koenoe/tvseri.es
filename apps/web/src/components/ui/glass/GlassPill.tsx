import Icon from '@/components/ui/icon/Icon';
import type { Glyph } from '@/components/ui/icon/types';
import cn from '@/lib/cn';

import { GLASS } from './glass';

/**
 * A glass label on a picture: an icon and a short line on a 32px glass pill
 * (the Up next card's "Last watched S02E01 yesterday").
 */
export default function GlassPill({
  children,
  className,
  glyph,
}: Readonly<{
  children: string;
  /** Where a card sizes it otherwise (the Up next card's 28px phone pill) */
  className?: string;
  glyph: Glyph;
}>) {
  const classes = cn(
    'flex h-8 max-w-[calc(100vw-96px)] items-center gap-1.5 rounded-full bg-white/5 px-3 text-caption font-medium text-white/80',
    GLASS,
    className,
  );
  return (
    <span className={classes}>
      <Icon className="shrink-0" glyph={glyph} size={13} />
      <span className="truncate">{children}</span>
    </span>
  );
}
