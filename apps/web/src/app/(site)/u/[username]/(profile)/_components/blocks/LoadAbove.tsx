import type { ReactNode } from 'react';

import { arrowUpGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import cn from '@/lib/cn';

/**
 * The row above a list that was jumped into (History's month, the
 * Library's A–Z): loads what comes before it with the reader's place held,
 * instead of the list growing upward under the finger.
 */
export default function LoadAbove({
  busy,
  children,
  className,
  onLoad,
}: Readonly<{
  /** Dims the row while it loads */
  busy?: boolean;
  children: ReactNode;
  /** The space below it */
  className: string;
  onLoad: () => void;
}>) {
  const classes = cn(
    'flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-12 bg-white/4 text-meta font-semibold transition-colors hover:bg-white/7 aria-busy:opacity-60',
    className,
  );
  return (
    <button
      aria-busy={busy || undefined}
      className={classes}
      onClick={onLoad}
      type="button"
    >
      <Icon glyph={arrowUpGlyph} size={16} />
      {children}
    </button>
  );
}
