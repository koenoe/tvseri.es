'use client';

import { LATE_FADE } from '@/components/motion/lateFade';
import { eyeGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import cn from '@/lib/cn';

import { useWatchedCount } from '../marking';

/** The line's own box in its slot: it arrives after the first paint, so it fades in */
const LINE = cn('flex min-w-0 items-center gap-1.5', LATE_FADE);

/**
 * The signed-in line after a row's title: an eye and
 * "You’ve seen N of M" for the shows the row draws. Nothing while the marks
 * load, for a visitor, or when none is watched. Desktop only, like the
 * subtitle (pass it as `Row`'s `note`).
 */
export default function SeenNote({
  ids,
}: Readonly<{ ids: ReadonlyArray<number> }>) {
  const seen = useWatchedCount(ids);
  return seen > 0 ? (
    <span className={LINE}>
      <Icon className="shrink-0" glyph={eyeGlyph} size={13} />
      <span className="truncate">{`You’ve seen ${seen} of ${ids.length}`}</span>
    </span>
  ) : null;
}
