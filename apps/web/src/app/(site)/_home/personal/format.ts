import type { PickReason } from '@tvseri.es/schemas';

/**
 * The words on home's signed-in touches (HMFinal, HMFinalMobile): the In
 * progress lane's time to finish, the Because-you-watched reasons and More
 * {genre}'s watchlist line. The Up next tile's words are the shared card's
 * (`components/up-next/upNextCopy.ts`).
 */

import { formatDuration } from '@/lib/format/duration';

/** The In progress lane: "2h to finish the season" (the phone drops "the season") */
export function finishLine(minutes: number): string {
  return `${formatDuration(minutes)} to finish the season`;
}

const capitalise = (text: string) =>
  text ? `${text.charAt(0).toUpperCase()}${text.slice(1)}` : text;

/** The line under a Because-you-watched poster: "Apple TV, like Severance" */
export function reasonLine(reason: PickReason, sourceTitle: string): string {
  const label = capitalise(reason.label.trim());
  if (reason.kind === 'recommendation' || !label) {
    return `Like ${sourceTitle}`;
  }
  return `${label}, like ${sourceTitle}`;
}

/** The row's subtitle: why this show was the starting point */
export function becauseSubtitle(from: 'favorite' | 'watched'): string {
  return from === 'favorite'
    ? 'Your favourite, minus what you’ve seen'
    : 'You finished it, minus what you’ve seen';
}

/** "Half of your watchlist is Sci-Fi & Fantasy", from the sampled share */
export function watchlistShareLine(
  share: Readonly<{ matching: number; sampled: number }>,
  genre: string,
): string {
  if (share.sampled <= 0 || share.matching <= 0) {
    return `Picked from your watchlist`;
  }
  const ratio = share.matching / share.sampled;
  const amount =
    ratio >= 0.95
      ? 'All'
      : ratio >= 0.7
        ? 'Most'
        : ratio > 0.55
          ? 'Over half'
          : ratio >= 0.45
            ? 'Half'
            : ratio >= 0.3
              ? 'A third'
              : ratio >= 0.2
                ? 'A quarter'
                : 'Some';
  return `${amount} of your watchlist is ${genre}`;
}
