import type { Premiere } from '@tvseri.es/schemas';

import ButtonContent from '@/components/ui/button/ButtonContent';
import {
  BUTTON_ICON_SIZE,
  buttonStyles,
} from '@/components/ui/button/buttonStyles';
import { arrowRightGlyph, calendarGlyph } from '@/components/ui/icon/glyphs';
import TileLink from '@/components/ui/tile/TileLink';
import showPath from '@/lib/routing/showPath';

import { MomentFrame } from '../feature/Moment';
import { PAGE_COLUMN } from '../frame';
import MomentLabel from '../MomentLabel';
import CountdownBody from './CountdownBody';
import CountdownSwitch, { type CountdownSlide } from './CountdownSwitch';
import {
  COUNTDOWN_CARD,
  COUNTDOWN_LABEL,
  COUNTDOWN_LABEL_ID,
} from './countdownLayout';
import { countdownChip } from './format';

/** "Open": ButtonLink's look on the show's own link (`TileLink`) */
const OPEN_BUTTON = buttonStyles({ size: 'sm' });

/** The Countdown's name: the card's label and its placeholder's */
export const COUNTDOWN_TITLE = 'Next big premiere';

/**
 * "Next big premiere": takes the
 * feature slot when the nearest big premiere is 3 days away or less (the
 * API's rule). One wide card, no title above it: the label
 * top left, the count, line, logo, date and season bottom left,
 * and bottom right up to three pills that crossfade between the next big
 * premieres; with one, "Open" in their place. Rendered here on the server;
 * only the switch is a client island. The logo and "Open" open the show
 * whole.
 */
export default function Countdown({
  premieres,
}: Readonly<{ premieres: ReadonlyArray<Premiere> }>) {
  // never without artwork (the API leaves those out; an older answer may not)
  const drawn = premieres.filter((premiere) => !!premiere.series.backdropImage);
  const first = drawn[0];
  if (!first) {
    return null;
  }
  const alone = drawn.length === 1;
  const slides: ReadonlyArray<CountdownSlide> = drawn.map((premiere) => ({
    backdrop: premiere.series.backdropImage ?? '',
    body: <CountdownBody premiere={premiere} />,
    color: premiere.series.backdropColor,
    key: premiere.series.id,
    pill: {
      label: countdownChip(premiere.daysAway),
      title: premiere.series.title,
    },
  }));
  const firstHref = showPath(first.series.id, first.series.slug);
  const open = alone ? (
    <TileLink
      backdrop={first.series.backdropImage}
      className={OPEN_BUTTON}
      href={firstHref}
    >
      <ButtonContent icon={arrowRightGlyph} iconSize={BUTTON_ICON_SIZE.sm}>
        {`Open ${first.series.title}`}
      </ButtonContent>
    </TileLink>
  ) : null;
  return (
    <MomentFrame name="feature">
      <section aria-labelledby={COUNTDOWN_LABEL_ID} className={PAGE_COLUMN}>
        <div className={COUNTDOWN_CARD}>
          <CountdownSwitch open={open} slides={slides} />
          <div className={COUNTDOWN_LABEL}>
            <MomentLabel
              glyph={calendarGlyph}
              id={COUNTDOWN_LABEL_ID}
              title={COUNTDOWN_TITLE}
            />
          </div>
        </div>
      </section>
    </MomentFrame>
  );
}
