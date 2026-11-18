'use client';

import { checkGlyph, eyeGlyph } from '@/components/ui/icon/glyphs';
import MetaItem from '@/components/ui/meta/MetaItem';

import { useCreditWatched } from '../watched/store';

/**
 * The viewer's mark on a Shows row: ✓ "Watched" when complete, the eye with
 * "10 of 20 watched" ("10 of 20" on phones) when partial; nothing signed out.
 */
export default function RowMark({
  personId,
  seriesId,
}: Readonly<{ personId: number; seriesId: number }>) {
  const watched = useCreditWatched(personId, seriesId);
  if (!watched) {
    return null;
  }
  return (
    <MetaItem
      icon={watched.complete ? checkGlyph : eyeGlyph}
      iconSize={12}
      title={watched.row}
      tone="highlight"
    >
      <span className="lg:hidden">{watched.short}</span>
      <span className="hidden lg:inline">{watched.row}</span>
    </MetaItem>
  );
}
