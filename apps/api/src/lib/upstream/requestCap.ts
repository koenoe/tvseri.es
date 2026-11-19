import { AsyncLocalStorage } from 'node:async_hooks';

import { UpstreamUnavailableError } from './errors';

type Cap = { left: number };

const capContext = new AsyncLocalStorage<Cap>();

/**
 * Runs `fn` with at most `cap` real TMDB calls (cached reads never reach
 * TMDB, so they don't count): a fan-out over a heavy user's shows can't
 * spend the instance's budget in a spike. The calls past it fail as
 * "unavailable", so a stored copy is served or the part is left out, and
 * later views fill it in.
 */
export const withTmdbCap = <T>(cap: number, fn: () => Promise<T>) =>
  capContext.run({ left: cap }, fn);

/** Takes one call from the current cap; throws once it is spent (no cap: free) */
export const takeCappedCall = (source: string) => {
  const cap = capContext.getStore();
  if (!cap) return;
  if (cap.left <= 0) {
    throw new UpstreamUnavailableError(source, 60, 'per-request cap reached');
  }
  cap.left -= 1;
};
