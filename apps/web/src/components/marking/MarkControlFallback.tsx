'use client';

import { ButtonFace, PULSE } from '@/components/ui/ghost/ghosts';
import { eyeGlyph, plusGlyph } from '@/components/ui/icon/glyphs';
import type { Glyph } from '@/components/ui/icon/types';
import { SIGNED_IN_ONLY, SIGNED_OUT_ONLY } from '@/components/ui/viewer/reveal';
import cn from '@/lib/cn';
import { NEW_TO_YOU } from '@/lib/marking/controlState';

import MarkControlRow from './MarkControlRow';
import { BUTTON, ICON, type MarkLook, PAIR, ROW } from './markControlStyles';
import type { MarkShow } from './singleFace';

const signedOutOnly = { [SIGNED_OUT_ONLY]: '' };
const signedInOnly = { [SIGNED_IN_ONLY]: '' };

/** The eye's outline: a ghost face takes a plain glyph (its icon doesn't show) */
const EYE: Glyph = { outline: eyeGlyph.outline };

/**
 * The paired control while its state streams: signed out, the pair (as it
 * lands, so nothing changes); signed in, two ghost pills at the pair's
 * widths (`ButtonFace`, one pulsing layer). The pre-paint script's
 * signed-in rule picks one before the first paint.
 */
export default function MarkControlFallback({
  look,
  show,
}: Readonly<{ look: MarkLook; show: MarkShow }>) {
  const ghosts = cn(PAIR[look], PULSE);
  return (
    <span className={ROW} data-mark-control="loading">
      <span {...signedOutOnly} className="flex">
        <MarkControlRow
          fadeIn={false}
          look={look}
          show={show}
          streamed={NEW_TO_YOU}
        />
      </span>
      <span {...signedInOnly} className="hidden">
        <span className={ghosts}>
          <ButtonFace
            className={BUTTON[look]}
            icon={plusGlyph}
            iconSize={ICON[look]}
            size="md"
            variant="primary"
          >
            Watchlist
          </ButtonFace>
          <ButtonFace
            className={BUTTON[look]}
            icon={EYE}
            iconSize={ICON[look]}
            size="md"
            variant="outline"
          >
            Seen it
          </ButtonFace>
        </span>
      </span>
    </span>
  );
}
