import { Ghost, PULSE, TextLine } from '@/components/ui/ghost/ghosts';
import { domeGlyph } from '@/components/ui/icon/glyphs';
import { POSTER_TILE } from '@/components/ui/tile/PosterTile';
import cn from '@/lib/cn';
import { MomentFrame } from '../../feature/Moment';
import { PAGE_COLUMN } from '../../frame';
import MomentLabel from '../../MomentLabel';
import {
  Arrow,
  IF_YOU_LIKED_CARD,
  IF_YOU_LIKED_LABEL,
  IF_YOU_LIKED_PICKS,
  IF_YOU_LIKED_ROW,
  IF_YOU_LIKED_SHOWN,
  IF_YOU_LIKED_SUBLINE,
  IF_YOU_LIKED_WORDS,
} from '../IfYouLiked';
import { LIKED_PICK, LIKED_REASON } from './LikedPick';
import { LIKED_SOURCE } from './LikedSource';

const CARD = cn(IF_YOU_LIKED_CARD, PULSE);
/** The show's title in the label, still to come */
const LABEL_NAME = 'h-3 w-28 shrink-0 rounded-4';
/** The subline wraps on a phone ("Four series like it, one on the theme …") */
const SUBLINE = cn(IF_YOU_LIKED_SUBLINE, 'flex flex-col');
const SUBLINE_PHONE = 'text-title-3 md:hidden';
const SOURCE_POSTER = 'aspect-2/3 w-full rounded-10';
const POSTER = 'aspect-2/3 w-full rounded-12';
const REASON = cn(LIKED_REASON, 'flex-col items-stretch gap-0');
const PICKS = Array.from({ length: IF_YOU_LIKED_SHOWN }, (_, n) => n);

/**
 * If you liked X's card while it loads: its label (the icon and its words,
 * a bar where the show's title goes), the subline's line (two on a
 * phone), the source's poster and facts, the arrow (it is static), and four posters with their
 * reason, two lines as most wrap; in the moment's frame, as the loaded card.
 */
export default function IfYouLikedGhost() {
  return (
    <MomentFrame name="toy-if-you-liked" placeholder>
      <div className={PAGE_COLUMN}>
        <div className={CARD}>
          <MomentLabel
            className={IF_YOU_LIKED_LABEL}
            glyph={domeGlyph}
            title={IF_YOU_LIKED_WORDS}
          >
            <Ghost className={LABEL_NAME} />
          </MomentLabel>
          <span className={SUBLINE}>
            <TextLine className="text-title-3" width="w-64" />
            <TextLine className={SUBLINE_PHONE} width="w-40" />
          </span>
          <div className={IF_YOU_LIKED_ROW}>
            <div className={LIKED_SOURCE}>
              <Ghost className={SOURCE_POSTER} />
              <TextLine className="text-meta" width="w-24" />
            </div>
            <Arrow />
            <div className={IF_YOU_LIKED_PICKS}>
              {PICKS.map((n) => (
                <div className={LIKED_PICK} key={n}>
                  <div className={POSTER_TILE}>
                    <Ghost className={POSTER} />
                    <span className={REASON}>
                      <TextLine className="text-meta" width="w-full" />
                      <TextLine className="text-meta" width="w-1/2" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </MomentFrame>
  );
}
