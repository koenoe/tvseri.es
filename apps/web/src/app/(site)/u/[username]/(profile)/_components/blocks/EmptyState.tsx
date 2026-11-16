import type { ReactNode } from 'react';

import type { Glyph, ToggleGlyph } from '@/components/ui/icon/types';
import cn from '@/lib/cn';

import IconDisc from './IconDisc';

/**
 * A block that has nothing to show (`.es-empty`): one
 * icon, one calm line, an optional second line. The block itself stays,
 * with a hollow dot. `action`: the block's one quiet action at the end
 * (From your circle's Find people); under the text on a
 * phone.
 */
export default function EmptyState({
  action,
  className,
  glyph,
  sub,
  title,
}: Readonly<{
  action?: ReactNode;
  className?: string;
  glyph: Glyph | ToggleGlyph;
  sub?: ReactNode;
  title: ReactNode;
}>) {
  const classes = cn(
    'flex min-h-[88px] flex-wrap items-center gap-3.5 rounded-12 bg-white/3 px-4 py-3.5 md:flex-nowrap',
    className,
  );
  return (
    <div className={classes}>
      <IconDisc glyph={glyph} />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-body-sm font-semibold">{title}</span>
        {sub ? <span className="text-caption text-white/60">{sub}</span> : null}
      </span>
      {action ? (
        // Below md the action sits under the text, aligned with it: beside it, the title would wrap
        <span className="shrink-0 max-md:basis-full max-md:pl-[50px]">
          {action}
        </span>
      ) : null}
    </div>
  );
}
