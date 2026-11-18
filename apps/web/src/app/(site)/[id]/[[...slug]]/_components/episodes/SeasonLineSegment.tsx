import { memo } from 'react';

import cn from '@/lib/cn';

import styles from './seasonLine.module.css';

/**
 * One episode on the season line: its state, its runtime width, the
 * one-episode hover preview, and the run highlight while painting. Memoised
 * with primitive props, so a drag re-renders only the segments it enters
 * or leaves.
 */
const SeasonLineSegment = memo(function SeasonLineSegment({
  className,
  detail,
  flex,
  index,
  inRun,
  title,
  unmark,
}: Readonly<{
  className: string;
  detail: string;
  flex: number;
  index: number;
  inRun: boolean;
  title: string;
  unmark: boolean;
}>) {
  const classes = cn(
    styles.seg,
    className,
    inRun && styles.run,
    inRun && unmark && styles.unrun,
  );
  const style = { flex };
  const label = `${title} · ${detail}`;
  return (
    <button
      aria-label={label}
      className={classes}
      data-index={index}
      style={style}
      tabIndex={-1}
      type="button"
    >
      <span className={styles.tip}>
        <b>{title}</b>
        {detail}
      </span>
    </button>
  );
});
SeasonLineSegment.displayName = 'SeasonLineSegment';

export default SeasonLineSegment;
