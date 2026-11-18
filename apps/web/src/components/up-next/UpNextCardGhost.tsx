import type { ReactNode } from 'react';

import Badge from '@/components/ui/button/Badge';
import { FLAT, TextLine } from '@/components/ui/ghost/ghosts';
import MetaRow from '@/components/ui/meta/MetaRow';
import { PROGRESS_TRACK } from '@/components/ui/progress/ProgressTrack';
import { GHOST_FILL } from '@/components/ui/row/RowGhosts';
import cn from '@/lib/cn';

import {
  UP_NEXT_ACTIONS,
  UP_NEXT_BAR,
  UP_NEXT_BODY,
  UP_NEXT_BOX,
  UP_NEXT_EPISODE,
  UP_NEXT_EPISODE_END,
  UP_NEXT_FACTS,
  UP_NEXT_LOGO,
  UP_NEXT_PROGRESS,
  UP_NEXT_START,
  UP_NEXT_TOP,
} from './upNextLayout';

const BOX = cn(UP_NEXT_BOX, GHOST_FILL);
const LOGO = cn(UP_NEXT_LOGO, GHOST_FILL, 'rounded-8');
const BAR = cn(UP_NEXT_BAR, FLAT);
const PILL = cn(GHOST_FILL, 'h-7 w-52 max-w-full rounded-full md:h-8');

/**
 * The Up next card while it streams, in the card's own boxes
 * (`upNextLayout.ts`): the logo, the facts line, the glass bar as one flat
 * block, the pill; the place's controls as flat shapes in their slots. It
 * carries the fill only: the placeholder around it pulses once.
 */
export default function UpNextCardGhost({
  actions,
  episodeEnd,
}: Readonly<{
  /** The controls' ghosts, top right (`ghostCircle`) */
  actions?: ReactNode;
  /** A control's ghost at the end of the bar's episode line */
  episodeEnd?: ReactNode;
}>) {
  return (
    <div className={BOX} data-placeholder="up-next-card">
      <div className={UP_NEXT_BODY}>
        <span className={LOGO} />
        <MetaRow className={UP_NEXT_FACTS} fit="drop">
          <TextLine className="text-meta" width="w-48 md:w-60" />
        </MetaRow>
        <div className={BAR}>
          <span className={UP_NEXT_EPISODE}>
            <Badge className="shrink-0" variant="code" />
            <TextLine className="text-title-3" width="w-32 md:w-40" />
            {episodeEnd ? (
              <span className={UP_NEXT_EPISODE_END}>{episodeEnd}</span>
            ) : null}
          </span>
          <span className={UP_NEXT_PROGRESS}>
            <span className={PROGRESS_TRACK} />
            <TextLine className="text-caption" width="w-36" />
          </span>
        </div>
      </div>
      <div className={UP_NEXT_TOP}>
        <div className={UP_NEXT_START}>
          <span className={PILL} />
        </div>
        {actions ? <div className={UP_NEXT_ACTIONS}>{actions}</div> : null}
      </div>
    </div>
  );
}
