/**
 * Where a pin's label goes (HMFinal `e2-pl`: 14px right of the pin, its
 * bottom 2px above the pin's centre), and the other three corners when that
 * one would cover another pin or leave the map. Decided on the server from
 * the pins' map points, once for phones and once from md, each for its
 * narrowest map: the label is a fixed size in px while the distances
 * between pins grow with the map, so a side that is free there is free on
 * every wider map of that range too.
 */

export type LabelSide = 'left-down' | 'left-up' | 'right-down' | 'right-up';

/** In order of preference: the board's side first, then its mirror, then below */
const SIDES: ReadonlyArray<LabelSide> = [
  'right-up',
  'left-up',
  'right-down',
  'left-down',
];

/** The narrowest maps in px: on a 360px phone, and at md (768) */
export const MAP_PX = { phone: 280, wide: 648 } as const;

/** The label's offsets from the pin's centre (`Pin` positions it so) */
const GAP_X = 14;
const LABEL_HEIGHT = 20;
const ABOVE = -22;
const BELOW = 2;

/** The caption's average glyph width (12px, medium) with a little to spare */
const CHAR_WIDTH = 7;

/** Another pin's dot (10px) and a pixel around it: the label may pass its hover ring, not the dot */
const PIN_RADIUS = 6;

type Point = Readonly<{ x: number; y: number }>;

type Rect = Readonly<{
  bottom: number;
  left: number;
  right: number;
  top: number;
}>;

const labelRect = (pin: Point, side: LabelSide, width: number): Rect => {
  const left = side.startsWith('right') ? pin.x + GAP_X : pin.x - GAP_X - width;
  const top = pin.y + (side.endsWith('up') ? ABOVE : BELOW);
  return { bottom: top + LABEL_HEIGHT, left, right: left + width, top };
};

const covers = (rect: Rect, pin: Point) =>
  pin.x + PIN_RADIUS > rect.left &&
  pin.x - PIN_RADIUS < rect.right &&
  pin.y + PIN_RADIUS > rect.top &&
  pin.y - PIN_RADIUS < rect.bottom;

/**
 * Each place's label side, in the places' order, on a map drawn `px` wide.
 * `points` are in the map's own units (`mapWidth` × `mapHeight`). A side
 * must stay inside the map and
 * cover no other pin; when none is free, the inside side covering the
 * fewest pins wins (the board's side on a tie).
 */
export function labelSides(
  places: ReadonlyArray<Readonly<{ name: string; point: Point }>>,
  mapWidth: number,
  mapHeight: number,
  px: number,
): LabelSide[] {
  const scale = px / mapWidth;
  const pins = places.map(({ point }) => ({
    x: point.x * scale,
    y: point.y * scale,
  }));
  const width = mapWidth * scale;
  const height = mapHeight * scale;
  return places.map(({ name }, index) => {
    const pin = pins[index] as Point;
    const labelWidth = name.length * CHAR_WIDTH;
    let best: LabelSide = 'right-up';
    let fewest = Number.POSITIVE_INFINITY;
    for (const side of SIDES) {
      const rect = labelRect(pin, side, labelWidth);
      const inside =
        rect.left >= 0 &&
        rect.right <= width &&
        rect.top >= 0 &&
        rect.bottom <= height;
      const covered = pins.filter(
        (other, at) => at !== index && covers(rect, other),
      ).length;
      // leaving the map is worse than covering a pin
      const cost = covered + (inside ? 0 : places.length);
      if (cost < fewest) {
        best = side;
        fewest = cost;
      }
      if (cost === 0) {
        break;
      }
    }
    return best;
  });
}
