import { NETWORKS } from '@tvseri.es/constants';

/**
 * `/network/{TMDB id}` → `/network/{slug}` for every network with a landing
 * (an id URL keeps working; the slug is the canonical URL).
 * Config rows, so the 308 needs no function; an id without a landing gets no
 * row and the page answers 404.
 */
export const NETWORK_ID_REDIRECTS = NETWORKS.map((network) => ({
  destination: `/network/${network.slug}`,
  permanent: true,
  source: `/network/${network.id}`,
}));
