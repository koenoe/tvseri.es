import type { NETWORKS } from '@tvseri.es/constants';

type Network = Pick<(typeof NETWORKS)[number], 'since'>;

/**
 * The hero's meta item: the year we know for a network
 * ("Since 1972", "Originals since 2012"), else the year of its first show
 * on TMDB (`getNetworkSince`), else nothing.
 */
export function sinceLine(
  network: Network,
  firstShowYear: number | null,
): string | null {
  if (network.since) {
    const { originals, year } = network.since;
    return originals ? `Originals since ${year}` : `Since ${year}`;
  }
  return firstShowYear === null ? null : `Since ${firstShowYear}`;
}
