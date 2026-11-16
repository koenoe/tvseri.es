/**
 * Did you know's fade from the left, from lg: dark only where the text sits,
 * then clearing fast so the right of the picture shows. The stops follow
 * the text (`FACT_BODY` in `layout.ts`): the text column starts after the
 * number (40px in, the number's room, a 36px gap) and is 520px wide, or
 * ends 244px from the right on a narrower card (the controls' room,
 * `lg:right-61`). White text needs the shade at 65% over a white picture,
 * the white/60 facts line about 84% (`fade.test.ts`), so the shade holds
 * 84% as far as the longest facts line reaches and 65% to the column's end.
 * Built here, not as a class, so the test reads the same stops.
 */

/** The number's room (`lg:min-w-50`): up to three digits ("790" is 200px) */
const NUMBER_ROOM = 200;

/** A number of four digits or more ("10,000" is 357px) */
const WIDE_NUMBER_ROOM = 360;

/** The longest facts line's end after a three-digit number ("2005–2019 · 15 seasons · Action & Adventure") */
const FACTS_REACH = 620;

/** The text column's end after a three-digit number (796), with a few pixels' margin */
const TEXT_END = 800;

/** The controls' room on the right (`lg:right-61`) */
const CONTROLS_ROOM = 244;

/** Where the fade has cleared, as a share of the card */
const CLEAR = 0.85;

type FadeStop = Readonly<{
  /** The shade's opacity at the stop */
  alpha: number;
  /** Its position in CSS */
  css: string;
  /** Its position in px on a card `width` wide */
  at: (width: number) => number;
}>;

/** The stops for a number `numberRoom` px wide */
export function factFadeStops(numberRoom: number): ReadonlyArray<FadeStop> {
  const shift = numberRoom - NUMBER_ROOM;
  const textEnd = TEXT_END + shift;
  const factsReach = FACTS_REACH + shift;
  return [
    { alpha: 0.88, at: () => 0, css: '0px' },
    {
      alpha: 0.84,
      at: (width) => Math.min(factsReach, width - CONTROLS_ROOM),
      css: `min(${factsReach}px, 100% - ${CONTROLS_ROOM}px)`,
    },
    {
      alpha: 0.65,
      at: (width) => Math.min(textEnd, width - CONTROLS_ROOM),
      css: `min(${textEnd}px, 100% - ${CONTROLS_ROOM}px)`,
    },
    { alpha: 0.05, at: (width) => width * CLEAR, css: `${CLEAR * 100}%` },
  ];
}

/** The number's room for its text ("48", "1,234") */
export const numberRoom = (value: string) =>
  value.length > 3 ? WIDE_NUMBER_ROOM : NUMBER_ROOM;

/** The picture's colour, darkened (`pictureShade`), near-black without one */
const SHADE_COLOR = 'var(--picture-shade, rgb(14 16 17))';

const gradient = (stops: ReadonlyArray<FadeStop>) =>
  `linear-gradient(90deg, ${stops
    .map(
      (stop) =>
        `color-mix(in srgb, ${SHADE_COLOR} ${Math.round(stop.alpha * 100)}%, transparent) ${stop.css}`,
    )
    .join(', ')})`;

const FADE = gradient(factFadeStops(NUMBER_ROOM));
const WIDE_FADE = gradient(factFadeStops(WIDE_NUMBER_ROOM));

/** The fade for a fact's number, as a `background-image` (`--fact-fade`) */
export const factFade = (value: string) =>
  numberRoom(value) === NUMBER_ROOM ? FADE : WIDE_FADE;
