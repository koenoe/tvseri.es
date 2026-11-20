import { formatGrouped } from '@tvseri.es/utils';

import CrossFade from '@/components/motion/CrossFade';
import { HIT_Y } from '@/components/ui/button/hitArea';
import { calendarGlyph, chevronRightGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import cn from '@/lib/cn';

import { monthName } from '../_lib/calendarDates';

const BANNER =
  'relative flex items-center gap-3 rounded-12 bg-white/5 px-3.5 py-3 text-meta leading-5 text-white/75 max-md:px-3 max-md:py-2.5 max-md:text-caption';

/** Round enough for the link's 10px corners 12px in (10px on a phone) */
const BANNER_WITH_LINK = 'rounded-[22px] max-md:rounded-[20px]';

/** 32px tall, 44 to the pointer (above and below, inside the banner's padding) */
const LINK = cn(
  'relative ml-auto inline-flex h-8 shrink-0 items-center gap-1 rounded-10 bg-white/10 pr-3 pl-3.5 text-body-sm font-medium text-white transition-[background-color,scale] duration-150 ease-out hover:bg-white/14 active:scale-96',
  HIT_Y[6],
);

/**
 * Over an empty month with nothing dated after it either: one line that
 * says why, and the way to the shows that will get a date
 */
export default function EmptyMonth({
  month,
  noDateYet,
}: Readonly<{ month: string; noDateYet: number }>) {
  const bannerClass = cn(BANNER, noDateYet > 0 && BANNER_WITH_LINK);
  return (
    <div className={bannerClass}>
      <Icon className="text-white/60" glyph={calendarGlyph} size={16} />
      {/* the month's name changes with ‹ ›: the sentence cross-fades, as
          the heading does */}
      <CrossFade className="text-pretty" frame="min-w-0" swapKey={month}>
        Nothing is dated in {monthName(month)} or later yet.
      </CrossFade>
      {noDateYet > 0 ? (
        <a className={LINK} href="#no-date-yet">
          No date yet · {formatGrouped(noDateYet)}
          <Icon glyph={chevronRightGlyph} size={13} />
        </a>
      ) : null}
    </div>
  );
}
