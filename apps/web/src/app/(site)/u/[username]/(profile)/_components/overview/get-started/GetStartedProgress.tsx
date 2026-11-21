'use client';

import CrossFade from '@/components/motion/CrossFade';
import cn from '@/lib/cn';

import { progressText } from './getStartedCopy';
import { PROGRESS, PROGRESS_BAR } from './layout';

const PROGRESS_TEXT = cn(
  PROGRESS,
  'whitespace-nowrap text-caption tabular-nums text-white/60',
);
const PROGRESS_SEGMENTS = cn(PROGRESS_BAR, 'flex gap-1');
const SEGMENTS = [1, 2, 3];

/**
 * "1 of 3 done" and its three-part bar: the count cross-fades as a step
 * completes (it keeps its width, tabular), the segments take their colour
 */
export default function GetStartedProgress({
  done,
}: Readonly<{ done: number }>) {
  return (
    <div className={PROGRESS_TEXT}>
      <CrossFade frame="shrink-0" swapKey={done}>
        {progressText(done)}
      </CrossFade>
      <span aria-hidden="true" className={PROGRESS_SEGMENTS}>
        {SEGMENTS.map((step) => {
          const segmentClass = cn(
            'h-1 flex-1 rounded-2 transition-colors',
            step <= done ? 'bg-white' : 'bg-white/12',
          );
          return <i className={segmentClass} key={step} />;
        })}
      </span>
    </div>
  );
}
