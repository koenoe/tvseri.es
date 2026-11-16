import { PULSE, TextLine } from '@/components/ui/ghost/ghosts';
import { clockGlyph } from '@/components/ui/icon/glyphs';
import cn from '@/lib/cn';
import { PAGE_COLUMN } from '../../frame';
import MomentLabel from '../../MomentLabel';
import { FEATURE_TITLE } from '../../moments';
import { PICTURE_BLEED } from '../../pictureCard';
import { MomentFrame } from '../Moment';
import {
  ARCHIVE_CARD,
  ARCHIVE_FADE,
  ARCHIVE_LABEL,
  ARCHIVE_TEXT,
} from './FromTheArchive';

const CARD = cn(ARCHIVE_CARD, PULSE);

/** The lines take the block's width (600 from md), not their own */
const TEXT = cn(ARCHIVE_TEXT, 'w-full');

/** On a phone the sentences take four lines (the why line one, from 360) */
const BODY_PHONE = 'text-body md:hidden';

/**
 * From the archive's placeholder, frame included (no title above): the
 * banner with its label (real text) and the text block's lines
 * where they land, each in its text's type style: the title, the two
 * sentences (four lines on a phone, two from md), the facts, the why line
 * (one line: "24 years old, not trending this week").
 */
export default function ArchiveGhost() {
  return (
    <MomentFrame name="feature" placeholder>
      <div className={PAGE_COLUMN}>
        <div className={CARD}>
          <span aria-hidden="true" className={PICTURE_BLEED}>
            <span className={ARCHIVE_FADE} />
          </span>
          <MomentLabel
            className={ARCHIVE_LABEL}
            glyph={clockGlyph}
            title={FEATURE_TITLE.archive}
          />
          <span className={TEXT}>
            <TextLine bar="h-5" className="text-title-1" width="w-56 md:w-72" />
            <span className="block">
              <TextLine className="text-body" width="w-full" />
              <TextLine className="text-body" width="w-11/12" />
              <TextLine className={BODY_PHONE} width="w-full" />
              <TextLine className={BODY_PHONE} width="w-1/3" />
            </span>
            <TextLine className="text-meta" width="w-48" />
            <TextLine className="text-body-sm" width="w-64" />
          </span>
        </div>
      </div>
    </MomentFrame>
  );
}
