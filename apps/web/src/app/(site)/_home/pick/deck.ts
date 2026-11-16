/**
 * The fanned deck of "Pick one for me".
 *
 * - rest: the pick in front, the others fanned behind it, half to each side,
 *   smaller, tilted and darker the further back they are.
 * - shuffle (.34s): gathered into a loose pile around the centre.
 * - settle (.72s): a spring back to the rest of the new pick.
 */

import type { LibraryIds } from '@tvseri.es/schemas';

import { librarySets } from '@/lib/marking/librarySets';

/** The cards dealt: the day's seven, or the first seven new to the viewer */
export const DEAL_SIZE = 7;

/**
 * The cards a viewer is dealt from the day's pool (the day's seven first,
 * then the reserve, in order): only shows new to them, never one they have
 * started, finished or are up to date with (`inProgress`, `watched`). A
 * show on their watchlist they haven't started stays. `null` (signed out,
 * the library still unknown): the day's seven. Fewer, or none, when the
 * pool runs out of new shows.
 */
export function dealPick<T extends Readonly<{ id: number }>>(
  pool: ReadonlyArray<T>,
  ids: LibraryIds | null,
): ReadonlyArray<T> {
  if (!ids) {
    return pool.slice(0, DEAL_SIZE);
  }
  const { inProgress, watched } = librarySets(ids);
  return pool
    .filter((card) => !inProgress.has(card.id) && !watched.has(card.id))
    .slice(0, DEAL_SIZE);
}

export type CardPose = Readonly<{
  brightness: number;
  transform: string;
  zIndex: number;
}>;

/** How far card `k` sits from the pick: 0 in front, ±1, ±2, ±3 behind */
export function deckOffset(pick: number, k: number, size: number): number {
  let offset = (((k - pick) % size) + size) % size;
  if (offset > size / 2) {
    offset -= size;
  }
  return offset;
}

export function restPose(pick: number, k: number, size: number): CardPose {
  const offset = deckOffset(pick, k, size);
  const away = Math.abs(offset);
  const x = offset * 118 - Math.sign(offset) * away * away * 8;
  const scale = away === 0 ? 1 : 1 - away * 0.1;
  // darker the further back: .6, .525, .45
  const brightness = away === 0 ? 1 : Math.max(0.45, 0.6 - (away - 1) * 0.075);
  return {
    brightness: round(brightness),
    // `--fan-spread` (DECK_BOX) pulls the fan in on a phone
    transform: `translateX(calc(${x}px * var(--fan-spread, 1))) rotate(${offset * 5}deg) scale(${round(scale)})`,
    zIndex: 10 - away,
  };
}

/** A loose pile; `seed` changes per roll so no two piles look alike */
export function shufflePose(k: number, seed: number): CardPose {
  const jitter = ((k * 37 + seed * 13) % 9) - 4;
  const y = (((k * 17 + seed) % 7) - 3) * 4;
  return {
    brightness: round(0.55 + ((k * 5 + seed) % 4) * 0.08),
    transform: `translate(${jitter * 9}px, ${y}px) rotate(${jitter * 3}deg) scale(0.86)`,
    zIndex: k,
  };
}

/** Any card but the current one (`random` in [0, 1), Math.random in use) */
export function nextPick(
  current: number,
  size: number,
  random: number,
): number {
  if (size < 2) {
    return current;
  }
  const step = 1 + Math.floor(random * (size - 1));
  return (current + step) % size;
}

const round = (value: number) => Math.round(value * 1000) / 1000;
