'use client';

import { formatMoment, type MomentStyle } from '../_lib/relativeTime';
import { useLoadedNow } from './useLoadedNow';

const NOON = Date.UTC(2026, 0, 1, 12, 0);

/**
 * A moment in the viewer's own time zone ("21:14 today"). The server doesn't
 * know the zone, so it renders nothing and the browser fills it in after
 * hydration (no mismatch). Until then it holds the room of a "today" moment
 * in invisible text, so a line that wraps doesn't grow when it arrives.
 * `prefix` is drawn with it ("Receiving · ").
 */
export default function LocalMoment({
  at,
  prefix = '',
  style = 'time-first',
}: Readonly<{ at: number; prefix?: string; style?: MomentStyle }>) {
  const now = useLoadedNow();
  if (now === null) {
    return (
      <span aria-hidden="true" className="invisible">
        {prefix}
        {formatMoment(NOON, NOON, style, 'UTC')}
      </span>
    );
  }
  return (
    <>
      {prefix}
      {formatMoment(at, now, style)}
    </>
  );
}
