'use client';

import Button from '@/components/ui/button/Button';
import CodeBadge from '@/components/ui/button/CodeBadge';
import {
  calendarGlyph,
  eyeGlyph,
  skippedGlyph,
} from '@/components/ui/icon/glyphs';
import MetaItem from '@/components/ui/meta/MetaItem';
import MetaRow from '@/components/ui/meta/MetaRow';
import cn from '@/lib/cn';

import {
  LEDGER_BUTTON,
  LEDGER_BUTTONS,
  LEDGER_HOLE,
  LEDGER_SETTLED,
} from './ledgerLayout';

import type { HoleState } from './ledgerLines';
import type { LedgerEpisodeView } from './loadLedger';

const SKIPPED = cn(LEDGER_BUTTON, 'text-white/80');

/**
 * One missing episode: code, "Aired Feb 2005", Watched
 * and Skipped. Once chosen the row settles and says which, with Undo: only
 * its surface fades (the fill gives way to a hairline), so every line keeps
 * white/60 or more.
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
  return (
    <div
      className={cn(
        LEDGER_HOLE,
        'transition-[background-color,box-shadow]',
        done && LEDGER_SETTLED,
      )}
      onFocus={onIntent}
      onPointerEnter={onIntent}
      onTouchStart={onIntent}
    >
      {/* one line: the air date drops whole before the buttons would wrap */}
      <MetaRow className="flex-1 gap-2.5 text-white/60" fit="drop">
        <CodeBadge code={episode.code} size="lane" />
        <MetaItem icon={calendarGlyph}>{episode.aired}</MetaItem>
      </MetaRow>
      {done ? (
        <span className="flex shrink-0 items-center gap-3 text-caption text-white/60">
          <MetaItem icon={state === 'watched' ? eyeGlyph : skippedGlyph}>
            {state === 'watched' ? 'Watched' : 'Skipped'}
          </MetaItem>
          <button
            className="cursor-pointer text-white/80 hover:text-white"
            onClick={undo}
            type="button"
          >
            Undo
          </button>
        </span>
      ) : (
        <span className={LEDGER_BUTTONS}>
          <Button className={LEDGER_BUTTON} onClick={watched} variant="outline">
            Watched
          </Button>
          <Button className={SKIPPED} onClick={skipped} variant="outline">
            Skipped
          </Button>
        </span>
      )}
    </div>
  );
}
