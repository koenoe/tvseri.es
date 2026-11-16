import {
  ButtonFace,
  Ghost,
  PULSE,
  TextLine,
} from '@/components/ui/ghost/ghosts';
import { shuffleGlyph } from '@/components/ui/icon/glyphs';
import cn from '@/lib/cn';
import { PAGE_COLUMN } from '../../frame';
import { ANOTHER_PAIR_LABEL, VERSUS_HINT } from './copy';
import {
  VERSUS_CARD,
  VERSUS_MIDDLE,
  VERSUS_MORE,
  VERSUS_NAME,
  VERSUS_POSTER,
  VERSUS_POSTER_STACK,
  VERSUS_RESULT,
  VERSUS_ROW,
  VERSUS_ROWS,
  VERSUS_SIDE,
  VERSUS_VALUE,
} from './layout';
import RowLabel from './RowLabel';
import { ROW_LABELS } from './rows';
import VersusHeading from './VersusHeading';

const CARD = cn(VERSUS_CARD, PULSE);
const VALUE_LEFT = cn(VERSUS_VALUE.left, 'justify-end');
const NAME = cn(VERSUS_NAME, 'flex justify-center');

function SideGhost({ side }: Readonly<{ side: 'left' | 'right' }>) {
  return (
    <div className={VERSUS_SIDE[side]}>
      <span className={VERSUS_POSTER_STACK}>
        <Ghost className={VERSUS_POSTER} />
        <TextLine className={NAME} width="w-16" />
      </span>
    </div>
  );
}

/**
 * Versus's placeholder: the same card, frame and grid; the posters and the
 * values as flat ghosts; the heading line, the rows' labels, the hint and
 * "Another pair" (flat) as they are, since they don't depend on the data.
 */
export default function VersusGhost() {
  return (
    <div aria-hidden="true" data-placeholder="toy">
      <div className={PAGE_COLUMN}>
        <div className={CARD}>
          <SideGhost side="left" />
          <div className={VERSUS_MIDDLE}>
            <VersusHeading />
            <div className={VERSUS_ROWS}>
              {ROW_LABELS.map((label) => (
                <div className={VERSUS_ROW} key={label}>
                  <TextLine className={VALUE_LEFT} width="w-8" />
                  <RowLabel label={label} />
                  <TextLine className={VERSUS_VALUE.right} width="w-8" />
                </div>
              ))}
            </div>
            <div className={VERSUS_RESULT}>{VERSUS_HINT}</div>
            <div className={VERSUS_MORE}>
              <ButtonFace icon={shuffleGlyph}>{ANOTHER_PAIR_LABEL}</ButtonFace>
            </div>
          </div>
          <SideGhost side="right" />
        </div>
      </div>
    </div>
  );
}
