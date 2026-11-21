import {
  ButtonFace,
  ButtonGhost,
  PULSE,
  TextLine,
} from '@/components/ui/ghost/ghosts';
import {
  arrowRightGlyph,
  infoGlyph,
  shuffleGlyph,
} from '@/components/ui/icon/glyphs';
import cn from '@/lib/cn';
import { PAGE_COLUMN } from '../../frame';
import MomentLabel from '../../MomentLabel';
import { FEATURE_TITLE } from '../../moments';
import { MomentFrame } from '../Moment';
import {
  ANOTHER_LABEL,
  DECK,
  DECK_CONTROLS,
  DECK_LABEL,
  FACT_BODY,
  FACT_NUMBER,
  FACT_NUMBER_COLUMN,
  FACT_OPEN,
  FACT_SENTENCE,
  FACT_TEXT_COLUMN,
  FACT_UNIT,
  PIP,
  PIP_OFF,
  PIPS,
} from './layout';

const CARD = cn(DECK, PULSE);

/** The room the sentence keeps (`FACT_SENTENCE_ROOM`): four lines on a
 * phone, three from md, two in the lg band */
const SENTENCE_BELOW_LG = cn(FACT_SENTENCE, 'lg:hidden');
const SENTENCE_PHONE = cn(FACT_SENTENCE, 'md:hidden');

/** The deck's facts (the API sends up to four) */
const PIP_COUNT = [0, 1, 2, 3];

/**
 * Did you know's placeholder, frame included (no title above): the deck
 * with its label (real text) and one fact's layout in it, the
 * number and its unit, the sentence's room (four lines on a phone, three from
 * md, two in the lg band), the facts line and the "Open" button, then the
 * pips and "Another".
 */
export default function DidYouKnowGhost() {
  return (
    <MomentFrame name="feature" placeholder>
      <div className={PAGE_COLUMN}>
        <div className={CARD}>
          <MomentLabel
            className={DECK_LABEL}
            glyph={infoGlyph}
            title={FEATURE_TITLE['did-you-know']}
          />
          <div className="relative h-full">
            <div className={FACT_BODY}>
              <div className={FACT_NUMBER_COLUMN}>
                <TextLine
                  bar="h-14 md:h-20"
                  className={FACT_NUMBER}
                  width="w-28 md:w-40"
                />
                <TextLine className={FACT_UNIT} width="w-24" />
              </div>
              <div className={FACT_TEXT_COLUMN}>
                <span className="block">
                  <TextLine
                    className={FACT_SENTENCE}
                    width="w-72 md:w-[480px]"
                  />
                  <TextLine
                    className={FACT_SENTENCE}
                    width="w-64 md:w-[400px]"
                  />
                  <TextLine
                    className={SENTENCE_BELOW_LG}
                    width="w-56 md:w-72"
                  />
                  <TextLine className={SENTENCE_PHONE} width="w-40" />
                </span>
                <TextLine className="text-meta" width="w-48" />
                <ButtonGhost
                  className={FACT_OPEN}
                  icon={arrowRightGlyph}
                  width="w-28"
                />
              </div>
            </div>
          </div>
          <div className={DECK_CONTROLS}>
            <span className={PIPS}>
              {PIP_COUNT.map((n) => {
                const pip = n > 0 ? PIP_OFF : PIP;
                return <i className={pip} key={n} />;
              })}
            </span>
            <ButtonFace icon={shuffleGlyph} size="md">
              {ANOTHER_LABEL}
            </ButtonFace>
          </div>
        </div>
      </div>
    </MomentFrame>
  );
}
