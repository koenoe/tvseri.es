'use client';

import Button from '@/components/ui/button/Button';
import { eyeGlyph, plusGlyph } from '@/components/ui/icon/glyphs';
import cn from '@/lib/cn';
import { useShowActions } from '@/lib/marking/showActions';

import { BUTTON, ICON, type MarkLook, PAIR, SOLID } from './markControlStyles';
import type { MarkShow } from './singleFace';

/**
 * New to you (and signed out): "+ Watchlist" (white) and "Seen it"
 * (outlined). Watchlist adds the series; Seen it marks every aired episode
 * seen with no date (`markSeen`). The series' marking state is fetched on
 * hover or focus, and a press waits for it; signed out, a press asks to sign
 * in. What the press did is the toast's, with Undo.
 */
export default function MarkPair({
  look,
  show,
}: Readonly<{ look: MarkLook; show: MarkShow }>) {
  const actions = useShowActions();
  const { id, title } = show;
  const prepare = () => actions.prepare(id);
  const add = () => actions.toggleWatchlist({ id, title });
  const seen = () => actions.markShowWatched({ id, title });
  const solid = cn(BUTTON[look], SOLID);
  const addName = `Add ${title} to your watchlist`;
  const seenName = `Mark ${title} as seen`;
  return (
    <span className={PAIR[look]}>
      <Button
        aria-label={addName}
        className={solid}
        icon={plusGlyph}
        iconSize={ICON[look]}
        onClick={add}
        onFocus={prepare}
        onPointerEnter={prepare}
        variant="primary"
      >
        Watchlist
      </Button>
      <Button
        aria-label={seenName}
        className={BUTTON[look]}
        icon={eyeGlyph}
        iconSize={ICON[look]}
        onClick={seen}
        onFocus={prepare}
        onPointerEnter={prepare}
        variant="outline"
      >
        Seen it
      </Button>
    </span>
  );
}
