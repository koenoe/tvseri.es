import type { TasteLevel } from '@tvseri.es/schemas';

import cn from '@/lib/cn';

import { LEVELS, levelStep } from '../visitor/match/levels';

type MeterLook = Readonly<{
  /** The meter's box: its height and the gap between steps */
  box: string;
  /** One step's width and corners */
  step: string;
  /** The six steps' heights, rising; the last may stand above the box */
  heights: ReadonlyArray<string>;
}>;

/** Each place's size, as the board draws it */
const LOOKS = {
  /** The match card on someone's profile */
  card: {
    box: 'h-[18px] gap-1',
    heights: ['h-2.5', 'h-3', 'h-3.5', 'h-4', 'h-[18px]', 'h-5'],
    step: 'w-2.5 rounded-[1.5px]',
  },
  /** The overview's From your circle chip */
  chip: {
    box: 'h-[9px] gap-[1.5px]',
    heights: ['h-[5px]', 'h-1.5', 'h-[7px]', 'h-2', 'h-[9px]', 'h-2.5'],
    step: 'w-[3px] rounded-[1.5px]',
  },
  /** Your Circle's rows, before the level word */
  row: {
    box: 'h-3 gap-0.5',
    heights: ['h-[7px]', 'h-2', 'h-[9px]', 'h-[11px]', 'h-3', 'h-[13px]'],
    step: 'w-1 rounded-[1.5px]',
  },
} as const satisfies Record<string, MeterLook>;

/** Unlit steps: white/14 on the ground, lit ones are the level's colour */
const UNLIT = 'bg-white/14';

/**
 * The compatibility level as six rising steps, lit up to the level in its
 * colour; none lit without a level. A picture only: the level word beside
 * it carries the meaning, so it is hidden from assistive tech.
 */
export default function LevelMeter({
  level,
  size,
}: Readonly<{ level: TasteLevel | null; size: keyof typeof LOOKS }>) {
  const look: MeterLook = LOOKS[size];
  const lit = levelStep(level);
  const fill = level ? LEVELS[level].dot : UNLIT;
  const box = cn('inline-flex shrink-0 items-end', look.box);
  return (
    <span aria-hidden="true" className={box}>
      {look.heights.map((height, index) => {
        const on = index < lit;
        const step = cn('block', look.step, height, on ? fill : UNLIT);
        return (
          <i className={step} data-lit={on ? '' : undefined} key={height} />
        );
      })}
    </span>
  );
}
