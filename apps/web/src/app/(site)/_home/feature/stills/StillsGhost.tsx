import {
  ButtonGhost,
  Ghost,
  PULSE,
  TextLine,
} from '@/components/ui/ghost/ghosts';
import {
  arrowRightGlyph,
  variantFilmStripGlyph,
} from '@/components/ui/icon/glyphs';
import { GHOST_FILL } from '@/components/ui/row/RowGhosts';
import cn from '@/lib/cn';
import { PAGE_COLUMN } from '../../frame';
import MomentLabel from '../../MomentLabel';
import { FEATURE_TITLE } from '../../moments';
import { MomentFrame } from '../Moment';
import {
  STILL_TILE,
  STILLS_CARD,
  STILLS_CONTENT,
  STILLS_GRID,
  STILLS_HEADLINE,
  STILLS_LABEL,
  STILLS_LOGO,
  STILLS_OPEN,
  STILLS_PICTURE,
  STILLS_PICTURE_FACTS,
  STILLS_PICTURE_TEXT,
  STILLS_POSTER,
  stillsGridStyles,
} from './layout';
import { STILLS_TYPICAL } from './stillsLayout';

const HEADLINE = cn('block', PULSE);
/** The headline's lines as a short title draws them: three on a phone, two to lg, one from lg */
const LINE_TWO = cn(STILLS_HEADLINE, 'lg:hidden');
const LINE_THREE = cn(STILLS_HEADLINE, 'md:hidden');
/** The 40px "Open {series}" as a flat pill */
const OPEN = cn(STILLS_OPEN, 'h-10 pr-4 pl-3.5', PULSE);
const CONTENT = cn(STILLS_CONTENT, PULSE);
const PICTURE = cn(STILLS_PICTURE, GHOST_FILL);
/** The facts' line, and the genre's second line on a phone */
const FACTS = cn('flex flex-col', STILLS_PICTURE_FACTS);
const FACTS_WRAP = 'text-meta md:hidden';
const STILL = cn(STILL_TILE, GHOST_FILL);
const LOGO = cn(STILLS_LOGO, 'rounded-6');

/**
 * One season in stills' placeholder, frame included, from the block's own
 * layout (`layout.ts`): the label (real text), the headline's lines, the
 * pill, then the season picture with the poster, the logo's box and the
 * facts' line, and the stills as flat tiles in the same grid (as many as
 * the day draws; eight when it isn't known).
 */
export default function StillsGhost({
  count,
}: Readonly<{ count?: number | null }>) {
  const grid = stillsGridStyles(count ?? STILLS_TYPICAL);
  const tiles = grid.tiles.map((style, n) => ({ n, style }));
  return (
    <MomentFrame name="feature" placeholder>
      <div className={PAGE_COLUMN}>
        <div className={STILLS_CARD}>
          <MomentLabel
            className={STILLS_LABEL}
            glyph={variantFilmStripGlyph}
            title={FEATURE_TITLE.stills}
          />
          <span className={HEADLINE}>
            <TextLine
              bar="h-5"
              className={STILLS_HEADLINE}
              width="w-4/5 lg:w-[600px]"
            />
            <TextLine bar="h-5" className={LINE_TWO} width="w-2/5" />
            <TextLine bar="h-5" className={LINE_THREE} width="w-3/5" />
          </span>
          <ButtonGhost className={OPEN} icon={arrowRightGlyph} width="w-26" />
          <div className={CONTENT}>
            <span className={PICTURE}>
              <Ghost className={STILLS_POSTER} />
              <span className={STILLS_PICTURE_TEXT}>
                <Ghost className={LOGO} />
                <span className={FACTS}>
                  <TextLine className="text-meta" width="w-40 md:w-48" />
                  <TextLine className={FACTS_WRAP} width="w-20" />
                </span>
              </span>
            </span>
            <div className={STILLS_GRID} style={grid.grid}>
              {tiles.map((tile) => (
                <span className={STILL} key={tile.n} style={tile.style} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </MomentFrame>
  );
}
