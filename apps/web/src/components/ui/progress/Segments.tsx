import cn from '@/lib/cn';

/**
 * Past this many episodes the segments would be thinner than their 4px gaps,
 * so the season is one 6px line filled to what you watched (the page's one
 * progress line)
 */
const MAX_SEGMENTS = 30;

/** The segments' line and one segment (their ghosts take the same) */
export const SEGMENTS_CLASS = 'flex gap-1';
export const SEGMENT_CLASS = 'h-1.5 min-w-0 flex-1 rounded-full';
export const SEGMENT_OFF = 'bg-white/14';
const SEGMENT_ON_CLASS = cn(SEGMENT_CLASS, 'bg-white');
const SEGMENT_OFF_CLASS = cn(SEGMENT_CLASS, SEGMENT_OFF);

/**
 * One 6px segment per episode of the season, white where watched; past `MAX_SEGMENTS` one line filled to the
 * share watched, so a long season never sets the row's width.
 */
export default function Segments({
  label,
  segments,
}: Readonly<{
  label: string;
  /** Per episode, in order: watched or not */
  segments: ReadonlyArray<boolean>;
}>) {
  const total = segments.length;
  if (total > MAX_SEGMENTS) {
    const watched = segments.filter(Boolean).length;
    const fill = { width: `${Math.min(100, (watched / total) * 100)}%` };
    const line = cn('relative h-1.5 overflow-hidden rounded-full', SEGMENT_OFF);
    return (
      <div aria-label={label} className={line} role="img">
        <span className="absolute inset-y-0 left-0 bg-white" style={fill} />
      </div>
    );
  }
  return (
    <div aria-label={label} className={SEGMENTS_CLASS} role="img">
      {segments.map((seen, index) => (
        <span
          className={seen ? SEGMENT_ON_CLASS : SEGMENT_OFF_CLASS}
          // biome-ignore lint/suspicious/noArrayIndexKey: one fixed segment per episode
          key={index}
        />
      ))}
    </div>
  );
}
