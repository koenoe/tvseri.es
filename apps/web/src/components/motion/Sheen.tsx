'use client';

import { type CSSProperties, useState } from 'react';

import styles from './sheen.module.css';

type SheenTiming = Readonly<{ ms: number; delay: number }>;

/**
 * The show is finished: the hero's line seals itself with one sheen, 700ms,
 * after the fill's 300ms slide to 100% (`TrackSlide`) has landed. Slow
 * enough to read as one calm pass, never a flash; it plays once.
 */
export const FINISH_SHEEN: SheenTiming = { delay: 300, ms: 700 };

/**
 * A season is complete: the same pass along the season line, first segment
 * to last, a little quicker (600ms) so the two moments rhyme without the
 * season one weighing as much as the whole show's. The segments turn white
 * at once, so it starts at once.
 */
export const SEASON_SWEEP: SheenTiming = { delay: 0, ms: 600 };

const styleOf = (timing: SheenTiming) =>
  ({
    '--sheen-delay': `${timing.delay}ms`,
    '--sheen-ms': `${timing.ms}ms`,
  }) as CSSProperties;

const STYLES = new Map<SheenTiming, CSSProperties>([
  [FINISH_SHEEN, styleOf(FINISH_SHEEN)],
  [SEASON_SWEEP, styleOf(SEASON_SWEEP)],
]);

/**
 * One soft light along a line, once (a culmination): absolutely placed over
 * the line's box, centred on it, decorative. Mount it keyed by the moment
 * (`useCulmination`) so each moment plays it once; nothing plays at rest.
 * Once played it is gone: a page Next keeps in a hidden `<Activity>`
 * restarts its CSS animations when Back shows it again.
 *
 * @example
 * {play === null ? null : <Sheen key={play} timing={FINISH_SHEEN} />}
 */
export default function Sheen({ timing }: Readonly<{ timing: SheenTiming }>) {
  const [played, setPlayed] = useState(false);
  if (played) {
    return null;
  }
  const style = STYLES.get(timing) ?? styleOf(timing);
  const end = () => setPlayed(true);
  return (
    <i
      aria-hidden="true"
      className={styles.sheen}
      onAnimationEnd={end}
      style={style}
    />
  );
}
