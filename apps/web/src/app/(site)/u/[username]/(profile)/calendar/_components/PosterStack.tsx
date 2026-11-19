import Image from 'next/image';

import cn from '@/lib/cn';

import type { CalendarDayModel } from '../_lib/calendarModel';
import { COUNT_BADGE, MARK_FILL } from './calendarStyles';

/** A day's posters: 46 × 69 in its cell (desktop only: a phone shows marks) */
const STACK = 'absolute top-[30px] left-1/2 -ml-[23px] block h-[69px] w-[46px]';

const POSTER =
  'absolute inset-0 size-full rounded-6 bg-white/8 object-cover outline-1 -outline-offset-1 outline-white/10';

/**
 * The cards behind the lead lean out to the right; on hover they fan
 * further and the lead lifts, on the DeckFan spring's feel (a CSS
 * transition, so it retargets when the pointer moves on).
 */
const MOVE =
  'transition-[translate,rotate,scale] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none';

const BEHIND = [
  cn(
    'z-2 translate-x-[9px] translate-y-[3px] rotate-7 brightness-70 group-hover/cell:translate-x-[15px] group-hover/cell:translate-y-px group-hover/cell:rotate-11',
    MOVE,
  ),
  cn(
    'z-1 translate-x-4 translate-y-1.5 rotate-13 brightness-50 group-hover/cell:translate-x-[26px] group-hover/cell:translate-y-[3px] group-hover/cell:rotate-19',
    MOVE,
  ),
] as const;

/** A blank card for a show behind the lead that has no poster */
const BLANK = ['bg-white/18', 'bg-white/10'] as const;

const LEAD = cn(
  'absolute inset-0 z-3 block group-hover/cell:-translate-y-[3px] group-hover/cell:scale-104',
  MOVE,
);

/** The lead casts the stack's shadow */
const LEAD_POSTER = cn(POSTER, 'shadow-[0_8px_16px_-8px_rgb(0_0_0/0.9)]');

/** The lead's mark on its corner, cut out of the poster by a ground-coloured edge */
const MARK = {
  finale: cn('bg-ground-deep', MARK_FILL.finale),
  premiere: MARK_FILL.premiere,
} as const;

const MARK_BOX =
  'absolute -top-1 -left-1 z-4 size-2.5 rounded-full ring-2 ring-ground-deep';

const COUNT = cn('absolute -top-1.5 -right-3.5 z-4 tabular-nums', COUNT_BADGE);

/**
 * One poster per day: the lead show on top, up to two cards behind it (the
 * next shows; a blank for one without a poster), the lead's premiere
 * dot or finale ring, and ×N for every episode that day. Decorative: the
 * cell's name says it all in words.
 */
export default function PosterStack({
  day,
}: Readonly<{ day: CalendarDayModel }>) {
  const markClass = day.mark ? cn(MARK_BOX, MARK[day.mark]) : null;
  return (
    <span aria-hidden="true" className={STACK}>
      {day.behind
        .map((src, index) => {
          const place = BEHIND[index] ?? BEHIND[1];
          const key = `behind-${index}`;
          if (src === null) {
            const blank = cn(
              'absolute inset-0 rounded-6',
              BLANK[index] ?? BLANK[1],
              place,
            );
            return <span className={blank} key={key} />;
          }
          const poster = cn(POSTER, place);
          return (
            <Image
              alt=""
              className={poster}
              height={69}
              key={key}
              src={src}
              width={46}
            />
          );
        })
        .reverse()}
      <span className={LEAD}>
        {day.lead.posterImage ? (
          <Image
            alt=""
            className={LEAD_POSTER}
            height={69}
            src={day.lead.posterImage}
            width={46}
          />
        ) : (
          <span className={POSTER} />
        )}
      </span>
      {markClass ? <span className={markClass} /> : null}
      {day.episodes > 1 ? <span className={COUNT}>×{day.episodes}</span> : null}
    </span>
  );
}
