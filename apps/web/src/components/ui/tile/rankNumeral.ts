/**
 * Where a numbered row's numeral sits and how wide its tile is
 * (`RankedTile`). In tile widths: the frame's tile is 290px, the poster its
 * last 180, a one-digit numeral 240px and a two-digit one 200px.
 */
export const TILE = {
  /** one digit's em (240 of 290) */
  em: 240 / 290,
  /** two digits' em (200 of 290) */
  em2: 200 / 290,
  /** one digit: the box's right edge at 146 of 290 (the board's 132 box and −0.06em) */
  oneDigitRight: 0.49655,
  /** the poster's width (180 of 290) */
  poster: 180 / 290,
  /**
   * two digits' tracking, in 1/1000 em (−0.05em): the board's −0.1em made a 1
   * overlap the digit after it, and where two outlined glyphs overlap the
   * second one's fill cuts the first one's line
   */
  track: -50,
  /** two digits: the numeral starts this far inside its tile */
  twoDigitStart: 2 / 290,
  /** two digits: how far the last digit runs behind the poster */
  twoDigitTuckPx: 40,
  width: 290,
} as const;

/**
 * Inter 800's proportional digits, in 1/1000 em: advance, ink start, ink
 * end (canvas `measureText` in Chromium; WebKit's advances are the same).
 * A newer Inter can move these by a few units: re-measure if the font
 * changes (the e2e checks every numeral's ink against its poster).
 */
const DIGITS: Readonly<Record<string, readonly [number, number, number]>> = {
  '0': [665, 25, 640],
  '1': [401, 18, 354],
  '2': [614, 33, 577],
  '3': [628, 30, 603],
  '4': [673, 30, 642],
  '5': [610, 24, 584],
  '6': [631, 25, 605],
  '7': [564, 21, 543],
  '8': [627, 25, 602],
  '9': [631, 25, 605],
};

/** A number's box width and its ink's start and end, in 1/1000 em */
function shape(rank: number) {
  const digits = String(rank)
    .split('')
    .map((digit) => DIGITS[digit] ?? DIGITS['0']!);
  // CSS letter-spacing follows every character, the last one too
  const track = digits.length > 1 ? TILE.track : 0;
  const advance = digits.reduce((sum, [adv]) => sum + adv + track, 0);
  const last = digits.at(-1)!;
  const inkEnd = advance - last[0] - track + last[2];
  return { advance, inkEnd, inkStart: digits[0]![1] };
}

export type NumeralFit = Readonly<{
  /** the font size, in tile widths */
  em: number;
  /** the box's right edge, from the tile's right, in tile widths */
  right: number;
  /** the tile's own width, in tile widths: 1 for one digit */
  tile: number;
}>;

/**
 * One digit stays at the frame's size and place. Two digits keep their
 * natural shape at the frame's smaller size: the last digit runs the same
 * 40px behind the poster for every number, and the tile is as wide as its
 * number needs (a 20 is wider than an 11), so the gap before each numeral
 * is the same and no digit is squeezed or lost.
 */
export function numeralFit(rank: number): NumeralFit {
  if (rank < 10) {
    return { em: TILE.em, right: TILE.oneDigitRight, tile: 1 };
  }
  const { advance, inkEnd, inkStart } = shape(rank);
  const unit = TILE.em2 / 1000;
  const tuck = TILE.twoDigitTuckPx / TILE.width;
  const ink = (inkEnd - inkStart) * unit;
  return {
    em: TILE.em2,
    right: TILE.poster - tuck - (advance - inkEnd) * unit,
    tile: TILE.twoDigitStart + ink - tuck + TILE.poster,
  };
}

/** Where a number's ink lands, from its tile's left (tile widths) */
export function inkOf(rank: number, fit: NumeralFit) {
  const { advance, inkEnd, inkStart } = shape(rank);
  const unit = fit.em / 1000;
  const boxRight = fit.tile - fit.right;
  return {
    end: boxRight - (advance - inkEnd) * unit,
    start: boxRight - (advance - inkStart) * unit,
  };
}
