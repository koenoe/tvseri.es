'use client';

import { LATE_FADE } from '@/components/motion/lateFade';
import SignedInOnly from '@/components/ui/viewer/SignedInOnly';
import cn from '@/lib/cn';

import { useHasWatched } from '../watched/store';

const SAMPLE = 'block h-1.5 w-4 rounded-[3px]';
const OUTLINE = 'shadow-[inset_0_0_0_1px_rgb(255_255_255/0.42)]';
const WATCHED_SAMPLE = cn(SAMPLE, 'bg-white/92');
const UNWATCHED_SAMPLE = cn(SAMPLE, OUTLINE);
const THICK = ['h-0.5 rounded-[1px]', 'h-1 rounded-2', 'h-1.5 rounded-[3px]'];

const KEY = 'flex items-center gap-4 text-meta whitespace-nowrap text-white/60';
const SAMPLE_ITEM = 'inline-flex items-center gap-1.5';
/** Watched and Not watched arrive with the viewer's marks: they fade in */
const MARK_ITEM = cn(SAMPLE_ITEM, LATE_FADE);

/**
 * The Career key: only marks on screen, each a real
 * bar. Watched and Not watched only once the viewer's marks are drawn; then
 * "Thicker = more episodes" in the bars' own fill (outlined with marks).
 * A stale display cookie (marks never come) keeps the signed-out key.
 */
function Key({
  className,
  marks,
}: Readonly<{ className?: string; marks: boolean }>) {
  const thick = marks ? OUTLINE : 'bg-white/26';
  const keyClass = cn(KEY, className);
  return (
    <span className={keyClass}>
      {marks ? (
        <>
          <span className={MARK_ITEM}>
            <i className={WATCHED_SAMPLE} />
            Watched
          </span>
          <span className={MARK_ITEM}>
            <i className={UNWATCHED_SAMPLE} />
            Not watched
          </span>
        </>
      ) : null}
      <span className={SAMPLE_ITEM}>
        <span aria-hidden="true" className="inline-flex items-center gap-0.75">
          {THICK.map((size) => {
            const barClass = cn('block w-2.5', size, thick);
            return <i className={barClass} key={size} />;
          })}
        </span>
        Thicker = more episodes
      </span>
    </span>
  );
}

/** Desktop: in the header row (the rule gives way, nothing moves). */
export function CareerKeyInline({ personId }: Readonly<{ personId: number }>) {
  const marks = useHasWatched(personId);
  return <Key className="max-lg:hidden" marks={marks} />;
}

/**
 * Phones: under the title. With marks the key wraps to
 * two lines; a signed-in viewer gets that second line reserved before the
 * first paint, so the marks arriving never push the chart down.
 */
export function CareerKeyBlock({ personId }: Readonly<{ personId: number }>) {
  const marks = useHasWatched(personId);
  return (
    <span className="flex flex-col lg:hidden">
      <Key className="flex-wrap gap-y-1.5" marks={marks} />
      {marks ? null : <SignedInOnly className="h-6.5" />}
    </span>
  );
}
