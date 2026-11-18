import type { LandingType } from '@tvseri.es/constants';

/**
 * The end card's line per landing type: one plain sentence that
 * invites the next step. The card's button already says "Back to Discover",
 * so the line does not repeat it.
 */
export const END_LINE: Readonly<Record<LandingType, string>> = {
  country: 'Try another country next.',
  decade: 'Try another decade next.',
  genre: 'Try another genre next.',
  language: 'Try another language next.',
  network: 'Try another network next.',
  theme: 'Follow another theme next.',
};

/**
 * The index pages' end card line: they just listed every country, language
 * or network, so "try another" would not make sense there.
 */
export const INDEX_END_LINE = 'There are more ways to browse.';
