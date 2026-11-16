import { describe, expect, it } from 'vitest';

import { contrast } from '@/components/background/pageColor';
import { channelsToHex, hexChannels, type Rgb } from '@/lib/color';

import { PICTURE_SHADE_SHARE } from '../../pictureCard';
import { factFadeStops, numberRoom } from './fade';

/** The brightest grounds the API serves (white/60 at 4.5:1 on them), and the default near-black */
const GROUNDS = ['#474747', '#524600', '#3d474e', '#57420d', '#1d3a9e'];
const NEAR_BLACK: Rgb = [14, 16, 17];

const mapRgb = ([r, g, b]: Rgb, map: (value: number) => number): Rgb => [
  map(r),
  map(g),
  map(b),
];

/** `pictureShade`: the colour mixed with black */
const shadeOf = (color: string): Rgb =>
  mapRgb(hexChannels(color), (value) => value * PICTURE_SHADE_SHARE);

type Stops = ReturnType<typeof factFadeStops>;

/** The fade's opacity `x` px into a card `width` wide (stops in order) */
function alphaAt(stops: Stops, x: number, width: number): number {
  let from: Readonly<{ alpha: number; at: number }> | undefined;
  for (const stop of stops) {
    const at = stop.at(width);
    if (at >= x) {
      return from
        ? from.alpha +
            ((stop.alpha - from.alpha) * (x - from.at)) / (at - from.at)
        : stop.alpha;
    }
    from = { alpha: stop.alpha, at };
  }
  return from?.alpha ?? 0;
}

/** Text at `textAlpha` white over the shade at `alpha` over a white picture */
function ratio(shade: Rgb, alpha: number, textAlpha: number): number {
  const ground = mapRgb(shade, (value) => value * alpha + 255 * (1 - alpha));
  const text = mapRgb(
    ground,
    (value) => 255 * textAlpha + value * (1 - textAlpha),
  );
  return contrast(channelsToHex(text), channelsToHex(ground));
}

/**
 * The rows from lg (`FACT_BODY`), measured on the page: the label, number and
 * unit from 40px; the text column after the number (`lg:min-w-50`) and a
 * 36px gap, 520px wide or ending 244px from the right; the longest facts
 * line ("2005–2019 · 15 seasons · Action & Adventure") 344px. Each row
 * reaches at most `to` px on a card `width` wide after a number `number` px
 * wide.
 */
const textStart = (number: number) => 40 + Math.max(200, number) + 36;
const textEnd = (number: number, width: number) =>
  Math.min(textStart(number) + 520, width - 244);

const ROWS = [
  { name: 'label', needs: 4.5, textAlpha: 0.6, to: () => 200 },
  { name: 'number', needs: 3, textAlpha: 1, to: (n: number) => 40 + n },
  { name: 'unit', needs: 4.5, textAlpha: 0.6, to: () => 110 },
  {
    name: 'facts line',
    needs: 4.5,
    textAlpha: 0.6,
    to: (n: number, width: number) =>
      Math.min(textStart(n) + 344, textEnd(n, width)),
  },
  {
    name: 'sentence and Open',
    needs: 4.5,
    textAlpha: 1,
    to: textEnd,
  },
];

/** Numbers and their width on the page */
const NUMBERS = [
  { value: '48', width: 140 },
  { value: '790', width: 200 },
  { value: '1,234', width: 291 },
  { value: '10,000', width: 357 },
];

describe('Did you know’s fade', () => {
  it('keeps every row readable over a white picture, on the narrowest and widest lg card', () => {
    const shades = [...GROUNDS.map(shadeOf), NEAR_BLACK];
    const failures = [960, 1216].flatMap((width) =>
      NUMBERS.flatMap((number) => {
        const stops = factFadeStops(numberRoom(number.value));
        return ROWS.flatMap((row) => {
          // the fade only falls from the left: the row's worst point is its end
          const alpha = alphaAt(stops, row.to(number.width, width), width);
          return shades
            .map((shade) => ratio(shade, alpha, row.textAlpha))
            .filter((value) => value < row.needs)
            .map(
              (value) =>
                `${width} ${number.value} ${row.name}: ${value.toFixed(2)}`,
            );
        });
      }),
    );
    expect(failures).toEqual([]);
  });

  it('clears to the picture on the right', () => {
    const stops = factFadeStops(numberRoom('48'));
    expect(alphaAt(stops, 1216 * 0.9, 1216)).toBeLessThanOrEqual(0.1);
  });
});
