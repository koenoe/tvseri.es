import BarTip, { type BarTipLayout } from '@/components/ui/chart/BarTip';
import cn from '@/lib/cn';

import type { YearBar } from './yearBars';

/** Tooltips on the first and last bars hang inward so they never leave the viewport */
const EDGE = 3;

/** Each place keeps its own look on purpose; don't unify them. */
const TIP_START: BarTipLayout = { place: 'left-0 z-5' };
const TIP_END: BarTipLayout = { place: 'right-0 z-5' };
const TIP_MIDDLE: BarTipLayout = { place: 'left-1/2 z-5 -translate-x-1/2' };

const tipPlace = (index: number, total: number) => {
  if (index < EDGE) {
    return TIP_START;
  }
  if (index >= total - EDGE) {
    return TIP_END;
  }
  return TIP_MIDDLE;
};

function Bar({
  bar,
  index,
  total,
}: Readonly<{ bar: YearBar; index: number; total: number }>) {
  const fillClass = cn(
    'block w-full rounded-2 transition-colors group-hover/bar:bg-white group-focus-visible/bar:bg-white',
    bar.current ? 'bg-cyan' : 'bg-white/22',
  );
  const tip = tipPlace(index, total);
  const style = { height: bar.height };
  return (
    <span
      aria-label={bar.label}
      className="group/bar relative flex flex-1 cursor-default items-end outline-none"
      role="img"
      tabIndex={0}
    >
      <span className={fillClass} style={style} />
      <BarTip layout={tip} title={bar.count}>
        {bar.range}
      </BarTip>
    </span>
  );
}

/** The chart's row and one week's slot (the placeholder's bars use the same) */
export const WEEK_BARS = 'flex h-14 items-stretch gap-0.5';
export const WEEK_SLOT = 'flex flex-1 items-end';

/** An empty year's 4px stub, this week cyan */
const STUB = 'block h-1 w-full rounded-2';
const STUB_CURRENT = `${STUB} bg-cyan`;
const STUB_OTHER = `${STUB} bg-white/10`;

/**
 * The weekly bars: focusable, each shows its week on
 * hover and focus. `flat` is the empty year: 4px stubs, this week cyan.
 */
export default function WeekBars({
  bars,
  flat,
  label,
}: Readonly<{
  bars: ReadonlyArray<YearBar>;
  flat: boolean;
  label: string;
}>) {
  return (
    <div aria-label={label} className={WEEK_BARS} role="group">
      {bars.map((bar, index) =>
        flat ? (
          <span aria-hidden="true" className={WEEK_SLOT} key={bar.range}>
            <span className={bar.current ? STUB_CURRENT : STUB_OTHER} />
          </span>
        ) : (
          <Bar bar={bar} index={index} key={bar.range} total={bars.length} />
        ),
      )}
    </div>
  );
}
