import {
  ButtonGhost,
  Ghost,
  PULSE,
  TextLine,
} from '@/components/ui/ghost/ghosts';
import { arrowRightGlyph, pinGlyph } from '@/components/ui/icon/glyphs';
import { GHOST_FILL } from '@/components/ui/row/RowGhosts';
import cn from '@/lib/cn';
import { ACTION_PAIR, ACTION_PAIR_BUTTON } from '../../actionPair';
import { MomentFrame } from '../../feature/Moment';
import { PAGE_COLUMN } from '../../frame';
import { TOY_TITLE } from '../../moments';
import {
  DETAIL,
  DETAIL_IMAGE,
  DETAIL_META,
  DETAIL_TITLE,
  MAP_BOX,
  WHERE_CARD,
} from './layout';

const IMAGE = cn(DETAIL_IMAGE, GHOST_FILL);
const DETAIL_GHOST = cn(DETAIL, PULSE);
const MAP = cn(MAP_BOX, 'rounded-12', PULSE);
const META = cn('text-meta', DETAIL_META);

/**
 * Where are they set?'s placeholder: the card with a flat ghost in the
 * map's box (the dotted map reads as the finished card: no finished
 * surfaces in a skeleton), and the place's show beside it: the
 * backdrop's box with the title's line, the facts, "Open" and "More set in"
 * as flat pills (as wide as typical labels, so they wrap where the real
 * ones do).
 */
export default function WhereSetGhost() {
  return (
    <MomentFrame name="toy" placeholder>
      <div className={PAGE_COLUMN}>
        <h2 className="sr-only">{TOY_TITLE['where-set']}</h2>
        <div className={WHERE_CARD}>
          <Ghost className={MAP} />
          <div className={DETAIL_GHOST}>
            <div className={IMAGE}>
              <span className={DETAIL_TITLE}>
                <TextLine className="text-title-3" width="w-40" />
              </span>
            </div>
            <TextLine className={META} width="w-48" />
            <span className={ACTION_PAIR}>
              <ButtonGhost
                className={ACTION_PAIR_BUTTON}
                icon={arrowRightGlyph}
                width="w-28"
              />
              <ButtonGhost
                className={ACTION_PAIR_BUTTON}
                icon={pinGlyph}
                width="w-32"
              />
            </span>
          </div>
        </div>
      </div>
    </MomentFrame>
  );
}
