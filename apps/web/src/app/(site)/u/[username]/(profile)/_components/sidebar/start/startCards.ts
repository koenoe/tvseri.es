/** One card of Start something new's deck */
export type StartCard = Readonly<{
  id: number;
  slug: string;
  title: string;
  poster: string;
  /** The network's logo and name (what TMDB calls the show's network), when known */
  provider: Readonly<{ logo: string; name: string }> | null;
  /** "1 season out" */
  seasons: string;
  /** "Returning", "Ended" */
  status: string;
}>;

/** "1 season out" for a watchlist show, "3 seasons" for a borrowed one */
export function seasonsLabel(count: number, out: boolean): string {
  if (count < 1) {
    return '';
  }
  const noun = count === 1 ? 'season' : 'seasons';
  return out ? `${count} ${noun} out` : `${count} ${noun}`;
}

/** Not now: the top card goes to the back */
export function sendToBack(
  order: ReadonlyArray<number>,
): ReadonlyArray<number> {
  const [top, ...rest] = order;
  return top === undefined ? order : [...rest, top];
}

/**
 * Pick one: a random card other than the top one comes to the front, the
 * rest keep their order. `random` is injected for tests (0 up to 1).
 */
export function dealRandom(
  order: ReadonlyArray<number>,
  random: () => number,
): ReadonlyArray<number> {
  if (order.length < 2) {
    return order;
  }
  const others = order.slice(1);
  const picked =
    others[Math.min(others.length - 1, Math.floor(random() * others.length))];
  return picked === undefined
    ? order
    : [picked, ...order.filter((id) => id !== picked)];
}

/** Where the card at a position in the deck sits, and how dark it is */
export type Slot = Readonly<{
  /** Black overlay opacity: brightness .55 / .75 / 1 */
  dim: number;
  opacity: number;
  rotate: number;
  x: number;
  y: number;
  z: number;
}>;

const SLOTS: ReadonlyArray<Slot> = [
  { dim: 0, opacity: 1, rotate: 0, x: 0, y: 0, z: 5 },
  { dim: 0.25, opacity: 1, rotate: -7, x: -44, y: 6, z: 3 },
  { dim: 0.25, opacity: 1, rotate: 7, x: 44, y: 6, z: 3 },
  { dim: 0.45, opacity: 1, rotate: -14, x: -84, y: 22, z: 1 },
  { dim: 0.45, opacity: 1, rotate: 14, x: 84, y: 22, z: 1 },
];

/** Past the fifth card: waiting behind the deck, invisible */
const BEHIND: Slot = { dim: 0.45, opacity: 0, rotate: 0, x: 0, y: 24, z: 0 };

export const slotAt = (position: number): Slot => SLOTS[position] ?? BEHIND;
