import { NETWORKS } from '@tvseri.es/constants';
import { rotationIndex } from '@tvseri.es/utils';

/**
 * Networks the Discover hub's Essentials row cycles through, one per day. All
 * of them have enough well-rated shows to fill the row.
 */
const ESSENTIALS_ROTATION = [
  'apple-tv',
  'hbo',
  'bbc-one',
  'netflix',
  'prime-video',
  'fx',
  'amc',
  'channel-4',
];

// Salts keep these from moving in lockstep with home's moments
const ESSENTIALS_SALT = 'discover-essentials';
const SEEDS_SALT = 'go-deeper-seeds';

/** The same day always gives the same network */
export const essentialsNetwork = (date: string) => {
  const slug =
    ESSENTIALS_ROTATION[
      rotationIndex(date, ESSENTIALS_ROTATION.length, ESSENTIALS_SALT)
    ];
  const network = NETWORKS.find((candidate) => candidate.slug === slug);
  if (!network) {
    throw new Error(`Essentials rotation has an unknown network: ${slug}`);
  }
  return network;
};

/** The seeds starting at the day's place in the rotation, wrapping around */
export const rotateSeeds = <T>(items: ReadonlyArray<T>, date: string): T[] => {
  const start = rotationIndex(date, items.length, SEEDS_SALT);
  return [...items.slice(start), ...items.slice(0, start)];
};
