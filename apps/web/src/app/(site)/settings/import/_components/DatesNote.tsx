import type { ReactNode } from 'react';

import Badge from '@/components/ui/button/Badge';
import { calendarGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';

/**
 * The dates line. On the Check step (`isNew`) it goes on
 * with "Rows without a date become “I don’t remember” New. Episodes you
 * already marked keep your dates.", shown before anything is written.
 */
export default function DatesNote({
  children,
  isNew = false,
}: Readonly<{ children: ReactNode; isNew?: boolean }>) {
  return (
    <p className="flex gap-2 text-meta leading-5 text-white/60 max-md:text-caption">
      <Icon className="mt-1 shrink-0" glyph={calendarGlyph} size={13} />
      <span>
        {children}
        {isNew ? (
          <>
            {' Rows without a date become '}
            <span className="inline-flex items-center gap-1.5 text-white/80">
              “I don’t remember”
              <Badge className="h-4.5 px-1.5 text-caption font-medium normal-case tracking-normal">
                New
              </Badge>
            </span>
            . Episodes you already marked keep your dates.
          </>
        ) : null}
      </span>
    </p>
  );
}
