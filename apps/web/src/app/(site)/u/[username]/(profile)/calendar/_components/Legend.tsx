import cn from '@/lib/cn';

import { LEGEND, MARK_FILL } from './calendarStyles';

const ITEM = 'inline-flex items-center gap-1.5';

/** 10px beside the posters, 8px as the phone's dots */
const DOT = 'size-2.5 rounded-full max-md:size-2';
const PREMIERE = cn(DOT, MARK_FILL.premiere);
const FINALE = cn(DOT, MARK_FILL.finale);
const COUNT_ITEM = cn(ITEM, 'max-md:hidden');

/** Under the month: what the pink dot, the cyan ring and ×N (desktop) say */
export default function Legend() {
  return (
    <div className={LEGEND}>
      <span className={ITEM}>
        <span className={PREMIERE} />
        Premiere
      </span>
      <span className={ITEM}>
        <span className={FINALE} />
        Finale
      </span>
      <span className={COUNT_ITEM}>
        <span className="h-5 min-w-5 rounded-full bg-[#121616] px-1.5 text-center text-[11px] leading-5 font-semibold text-white shadow-[0_0_0_1px_rgb(255_255_255/0.18)]">
          ×N
        </span>
        · episodes that day
      </span>
    </div>
  );
}
