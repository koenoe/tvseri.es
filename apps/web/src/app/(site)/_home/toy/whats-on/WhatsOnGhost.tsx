import { Ghost, PULSE, TextLine } from '@/components/ui/ghost/ghosts';
import { onAirGlyph } from '@/components/ui/icon/glyphs';
import { GHOST_FILL } from '@/components/ui/row/RowGhosts';
import cn from '@/lib/cn';
import { ACTION_PAIR } from '../../actionPair';
import { MomentFrame } from '../../feature/Moment';
import { PAGE_COLUMN } from '../../frame';
import MomentLabel from '../../MomentLabel';
import { TOY_TITLE } from '../../moments';
import {
  CAPTION_CHANNEL,
  CAPTION_FOOT,
  CAPTION_LOGO,
  CAPTION_META,
  CAPTION_TOP,
  CHANNEL,
  CHANNELS,
  REMOTE,
  REMOTE_HEAD,
  REMOTE_LABEL,
  SCREEN,
  WHATS_ON_GRID,
} from './layout';

// Flat ghosts only (no finished surfaces or controls in a
// skeleton): the TV is a ghost block, not its dark screen; buttons, the
// arrows and the channel numbers are ghost shapes in their boxes. The
// label row's icon and words are static copy, so they are real.
const TV = cn(SCREEN, GHOST_FILL);
const ROW = cn(CHANNEL, 'cursor-default hover:bg-transparent');
const META = cn('text-meta', CAPTION_META);
const PILL = 'h-9 rounded-full';
const OPEN_PILL = cn(PILL, 'w-40');
const SECOND_PILL = cn(PILL, 'w-32');
const COLUMN = cn(PAGE_COLUMN, PULSE);
const ARROW = 'size-8 rounded-full';

/** One show per service: the API's usual six */
const CHANNEL_COUNT = [0, 1, 2, 3, 4, 5];

/**
 * What's on's placeholder, in the moment's frame: the TV's box with ghosts
 * where channel 01's caption lands (the channel line, the logo's box, the
 * facts and the two actions) beside the remote: its label row (the real
 * words, the arrows as circles) over six channels, each a number, the
 * service's mark and two lines.
 */
export default function WhatsOnGhost() {
  return (
    <MomentFrame name="toy" placeholder>
      <div className={COLUMN}>
        <div className={WHATS_ON_GRID}>
          <div className={TV}>
            <span className={CAPTION_TOP}>
              <TextLine bar="h-5" className={CAPTION_CHANNEL} width="w-16" />
              <TextLine className="text-body-sm" width="w-24" />
            </span>
            <div className={CAPTION_FOOT}>
              <Ghost className={CAPTION_LOGO} />
              <TextLine className={META} width="w-48" />
              <span className={ACTION_PAIR}>
                <Ghost className={OPEN_PILL} />
                <Ghost className={SECOND_PILL} />
              </span>
            </div>
          </div>
          <div className={REMOTE}>
            <div className={REMOTE_HEAD}>
              <MomentLabel
                className={REMOTE_LABEL}
                glyph={onAirGlyph}
                title={TOY_TITLE['whats-on']}
              />
              <Ghost className={ARROW} />
              <Ghost className={ARROW} />
            </div>
            <div className={CHANNELS}>
              {CHANNEL_COUNT.map((n) => (
                <span className={ROW} key={n}>
                  <TextLine className="text-meta" width="w-5" />
                  <Ghost className="size-7 rounded-6" />
                  <span className="flex min-w-0 flex-col">
                    <TextLine className="text-body-sm" width="w-24" />
                    <TextLine className="text-caption" width="w-32" />
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </MomentFrame>
  );
}
