import type { EpisodeRef } from '@tvseri.es/schemas';

type Box = Readonly<{
  height: number;
  left: number;
  top: number;
  width: number;
}>;
type Viewport = Readonly<{ height: number; width: number }>;

/**
 * Past this the open no longer follows the press (the show wasn't ready:
 * its skeleton came first), so the card's box means nothing on screen.
 */
const ORIGIN_LIFETIME_MS = 3000;

type Held = Readonly<{
  at: number;
  box: Box;
  code: string;
  viewport: Viewport;
}>;

let held: Held | null = null;

const codeOf = (seriesId: number, ref: EpisodeRef) =>
  `${seriesId}:${ref.seasonNumber}:${ref.episodeNumber}`;

/**
 * A card on another page opened this episode (Home's resume card): the
 * modal grows from where the card was, over the show page arriving
 * underneath, instead of from a tile on the show page.
 */
export function holdModalOrigin(
  seriesId: number,
  ref: EpisodeRef,
  box: Box,
  at: number,
  viewport: Viewport,
) {
  held = { at, box, code: codeOf(seriesId, ref), viewport };
}

/**
 * The held box for the episode it was held for; null when it is stale (too
 * late, or the window changed size since). A read: the open forgets it
 * once it has opened (`forgetModalOrigin`).
 */
export function modalOriginFor(
  seriesId: number,
  ref: EpisodeRef,
  now: number,
  viewport: Viewport,
): Box | null {
  const origin = held;
  return origin &&
    origin.code === codeOf(seriesId, ref) &&
    now - origin.at <= ORIGIN_LIFETIME_MS &&
    origin.viewport.width === viewport.width &&
    origin.viewport.height === viewport.height
    ? origin.box
    : null;
}

/** The modal has opened from it: later opens grow from their own tile */
export function forgetModalOrigin() {
  held = null;
}
