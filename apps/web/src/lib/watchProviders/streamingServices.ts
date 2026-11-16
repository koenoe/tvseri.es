import type { WatchProvider } from '@tvseri.es/schemas';

/**
 * TMDB's region list (`/discover/watch-providers`) holds every provider that
 * has the region's titles in any way, stores and aggregators included. "Your
 * services" are what you watch on, by subscription or free ("Coming up
 * and suggestions only show what you can watch"), so stores where episodes
 * are bought or rented, and channels that only gather others, go. TMDB's
 * list carries no offer type, so they are named here: by their stable TMDB
 * ids, and by name for the ones whose ids vary per region or that rename.
 */
const STORES = new Set([
  2, // Apple TV Store (was Apple iTunes)
  3, // Google Play Movies
  7, // Fandango At Home (was Vudu)
  10, // Amazon Video (rent and buy; Prime Video is 9 and 119)
  35, // Rakuten TV
  40, // Chili
  68, // Microsoft Store
  130, // Sky Store
  192, // YouTube (rent and buy; YouTube Premium is 188)
]);

/** "Apple TV Store", "Sky Store", "Microsoft Store"… and JustWatch's own channels */
const NOT_A_SERVICE = /(?:\bstore$|^justwatch\b)/i;

const isStreamingService = (
  provider: Pick<WatchProvider, 'id' | 'name'>,
): boolean =>
  !STORES.has(provider.id) && !NOT_A_SERVICE.test(provider.name.trim());

/** A region's providers that are services (`isStreamingService`), in order */
export const streamingServices = <T extends Pick<WatchProvider, 'id' | 'name'>>(
  providers: ReadonlyArray<T>,
): ReadonlyArray<T> => providers.filter(isStreamingService);
