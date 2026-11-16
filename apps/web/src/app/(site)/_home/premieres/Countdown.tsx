import type { Premiere } from '@tvseri.es/schemas';

import ButtonLink from '@/components/ui/button/ButtonLink';
import { arrowRightGlyph, calendarGlyph } from '@/components/ui/icon/glyphs';
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

/** The Countdown's name: the card's label and its placeholder's */
export const COUNTDOWN_TITLE = 'Next big premiere';

/**
 * "Next big premiere": takes the
 * feature slot when the nearest big premiere is 3 days away or less (the
 * API's rule). One wide card, no title above it: the label
 * top left, the count, line, logo, date and season bottom left,
 * and bottom right up to three pills that crossfade between the next big
 * premieres; with one, "Open" in their place. Rendered here on the server;
 * only the switch is a client island.
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
  const open = alone ? (
    <ButtonLink
      href={showPath(first.series.id, first.series.slug)}
      icon={arrowRightGlyph}
      size="sm"
    >
      {`Open ${first.series.title}`}
    </ButtonLink>
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
