import type { CSSProperties, Ref } from 'react';

import cn from '@/lib/cn';

import { BINGE_STRIP, BINGE_STRIP_CELL } from './layout';
import { type BingePlan, type StripCell, stripLabel } from './plan';

/** The board's pitch: min(20, ⌊width / days⌋), or ⌊width / 120⌋ when it wraps */
export const STRIP_PITCH = 'round(down, min(20px, 100cqw / var(--days)), 1px)';

/** 10px dots, 6px when the pitch is under 16px (the board's `e3-sm`) */
export const DOT_SIZE = 'size-[clamp(6px,(var(--p)_-_15.5px)_*_1000,10px)]';
/** The last night: 16px, 12px on a small pitch, with a soft ring */
const FINISH =
  'size-[clamp(12px,(var(--p)_-_15.5px)_*_1000,16px)] bg-white shadow-[0_0_0_4px_rgb(255_255_255/0.18)]';

const LABEL_ALIGN = {
  center: 'left-1/2 -translate-x-1/2 text-white/60 after:left-1/2',
  end: 'right-0 font-medium text-white after:right-[calc(var(--p)/2)]',
  start: 'left-0 font-medium text-white after:left-[calc(var(--p)/2)]',
} as const;

function Dot({ cell, dated }: Readonly<{ cell: StripCell; dated: boolean }>) {
  const dotClasses = cn(
    'block rounded-full',
    cell.dot === 'finish'
      ? FINISH
      : cell.dot === 'on'
        ? `${DOT_SIZE} bg-white/72`
        : `${DOT_SIZE} shadow-[inset_0_0_0_1.5px_rgb(255_255_255/0.2)]`,
    cell.tonight &&
      'outline-[1.5px] outline-offset-3 outline-white/70 outline-solid',
  );
  const label = cell.label;
  // Before the viewer's day is known only "Tonight" can be drawn
  const showLabel = label && (dated || label.text === 'Tonight');
  const labelClasses = label
    ? cn(
        'absolute bottom-[26px] text-caption whitespace-nowrap tabular-nums after:absolute after:top-full after:h-1.5 after:w-px after:bg-white/20',
        LABEL_ALIGN[label.align],
      )
    : '';
  return (
    <span className={BINGE_STRIP_CELL} title={dated ? cell.tip : undefined}>
      {showLabel ? <small className={labelClasses}>{label.text}</small> : null}
      <i className={dotClasses} />
    </span>
  );
}

/**
 * Tonight to the last night, one dot per day (HMFinal `e3-strip`): filled on
 * a viewing night, a ring on a night off, the big dot on the last one. Its
 * height is the same before and after the viewer's day is known.
 */
export default function NightStrip({
  dated,
  plan,
  ref,
}: Readonly<{ dated: boolean; plan: BingePlan; ref: Ref<HTMLDivElement> }>) {
  const style = {
    '--days': plan.oneLine ? plan.cells.length : 120,
    '--p': STRIP_PITCH,
  } as CSSProperties;
  const classes = cn(
    BINGE_STRIP,
    plan.oneLine ? 'flex-nowrap justify-between' : 'flex-wrap gap-y-10',
  );
  const label = dated ? stripLabel(plan) : `${plan.nights} viewing nights`;
  return (
    <div
      aria-label={label}
      className={classes}
      ref={ref}
      role="img"
      style={style}
    >
      {plan.cells.map((cell) => (
        <Dot cell={cell} dated={dated} key={cell.day} />
      ))}
    </div>
  );
}
