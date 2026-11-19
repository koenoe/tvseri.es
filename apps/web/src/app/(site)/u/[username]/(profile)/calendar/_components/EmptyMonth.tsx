import { formatGrouped } from '@tvseri.es/utils';

import { calendarGlyph, chevronRightGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';

import { monthName } from '../_lib/calendarDates';

/**
 * Over an empty month with nothing dated after it either: one line that
 * says why, and the way to the shows that will get a date
 */
export default function EmptyMonth({
  month,
  noDateYet,
}: Readonly<{ month: string; noDateYet: number }>) {
  return (
    <div className="flex items-center gap-3 rounded-12 bg-white/5 px-3.5 py-3 text-meta leading-5 text-white/75 max-md:px-3 max-md:py-2.5 max-md:text-caption">
      <Icon className="text-white/60" glyph={calendarGlyph} size={16} />
      <span className="min-w-0 text-pretty">
        Nothing is dated in {monthName(month)} or later yet.
      </span>
      {noDateYet > 0 ? (
        <a
          className="ml-auto inline-flex h-8 shrink-0 items-center gap-1 rounded-10 bg-white/10 px-3.5 text-body-sm font-medium text-white transition-colors hover:bg-white/14"
          href="#no-date-yet"
        >
          No date yet · {formatGrouped(noDateYet)}
          <Icon glyph={chevronRightGlyph} size={13} />
        </a>
      ) : null}
    </div>
  );
}
