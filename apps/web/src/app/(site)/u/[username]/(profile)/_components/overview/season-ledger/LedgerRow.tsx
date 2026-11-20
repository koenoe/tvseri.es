'use client';

import CrossFade from '@/components/motion/CrossFade';
import Button from '@/components/ui/button/Button';
import CodeBadge from '@/components/ui/button/CodeBadge';
import { HIT_ALL } from '@/components/ui/button/hitArea';
import {
  calendarGlyph,
  eyeGlyph,
  skippedGlyph,
} from '@/components/ui/icon/glyphs';
import MetaItem from '@/components/ui/meta/MetaItem';
import MetaRow from '@/components/ui/meta/MetaRow';
import cn from '@/lib/cn';

import { LANE_ROW_BUTTON } from '../../blocks/laneRowButton';
import { LEDGER_BUTTONS, LEDGER_HOLE, LEDGER_SETTLED } from './ledgerLayout';

import type { HoleState } from './ledgerLines';
import type { LedgerEpisodeView } from './loadLedger';

const SKIPPED = cn(LANE_ROW_BUTTON, 'text-white/80');

/** A 20px word, reaching 40px: the settled row's full height */
const UNDO = cn(
  'relative cursor-pointer text-white/80 transition-colors hover:text-white',
  HIT_ALL[10],
);

/**
 * The answer's place at the row's end: its two copies stack in one cell
 * while they cross, each centred and at the end, so neither jumps as the
 * other goes
 */
const ANSWER_CELL = 'flex items-center justify-end';

/**
 * One missing episode: code, "Aired Feb 2005", Watched and Skipped. Once
 * chosen the row settles and says which, with Undo: its surface fades (the
 * fill gives way to a hairline), so every line keeps white/60 or more, and
 * the answer cross-fades with the buttons (`CrossFade`, focus moving from
 * the button pressed to Undo and back).
 */
export default function LedgerRow({
  episode,
  onChoose,
  onIntent,
  state,
}: Readonly<{
  episode: LedgerEpisodeView;
  onChoose: (episode: LedgerEpisodeView, state: HoleState) => void;
  /** Pointer, focus or touch: seed the show for the marking core */
  onIntent: () => void;
  state: HoleState;
}>) {
  const done = state !== 'open';
  const watched = () => onChoose(episode, 'watched');
  const skipped = () => onChoose(episode, 'skipped');
  const undo = () => onChoose(episode, 'open');
  const rowClass = cn(
    LEDGER_HOLE,
    'transition-[background-color,box-shadow]',
    done && LEDGER_SETTLED,
  );
  const stateGlyph = state === 'watched' ? eyeGlyph : skippedGlyph;
  return (
    <div
      className={rowClass}
      onFocus={onIntent}
      onPointerEnter={onIntent}
      onTouchStart={onIntent}
    >
      {/* one line: the air date drops whole before the buttons would wrap */}
      <MetaRow className="flex-1 gap-2.5 text-white/60" fit="drop">
        <CodeBadge code={episode.code} size="lane" />
        <MetaItem icon={calendarGlyph}>{episode.aired}</MetaItem>
      </MetaRow>
      <CrossFade
        className={ANSWER_CELL}
        frame="shrink-0"
        swapKey={done ? 'done' : 'open'}
      >
        {done ? (
          <span className="flex shrink-0 items-center gap-3 text-caption text-white/60">
            <MetaItem icon={stateGlyph}>
              {state === 'watched' ? 'Watched' : 'Skipped'}
            </MetaItem>
            <button className={UNDO} onClick={undo} type="button">
              Undo
            </button>
          </span>
        ) : (
          <span className={LEDGER_BUTTONS}>
            <Button
              className={LANE_ROW_BUTTON}
              onClick={watched}
              variant="outline"
            >
              Watched
            </Button>
            <Button className={SKIPPED} onClick={skipped} variant="outline">
              Skipped
            </Button>
          </span>
        )}
      </CrossFade>
    </div>
  );
}
