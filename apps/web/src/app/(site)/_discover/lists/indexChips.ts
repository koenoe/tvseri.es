import {
  type LandingType,
  landingFilter,
  NETWORKS,
} from '@tvseri.es/constants';
import type { CountryOrLanguage } from '@tvseri.es/schemas';

import landingPath from '@/lib/routing/landingPath';

import type { LandingChip } from '../landing';

/**
 * The chips of the index pages `/country`, `/language` and `/network`: one
 * per landing, A to Z by English name.
 */

const byLabel = (a: LandingChip, b: LandingChip) =>
  a.label.localeCompare(b.label, 'en');

/** The slugs of the TMDB countries or languages that have a landing */
export function landingSlugs(
  type: Extract<LandingType, 'country' | 'language'>,
  entries: ReadonlyArray<CountryOrLanguage>,
): ReadonlyArray<string> {
  return entries
    .map((entry) => entry.code.toLowerCase())
    .filter((slug) => landingFilter(type, slug) !== undefined);
}

/**
 * Countries or languages with a landing and at least one show (`counts`
 * from the landing counts; a slug without a count is left out), named in
 * English.
 */
export function chipsWithShows(
  type: Extract<LandingType, 'country' | 'language'>,
  entries: ReadonlyArray<CountryOrLanguage>,
  counts: Readonly<Record<string, number>>,
): ReadonlyArray<LandingChip> {
  const slugs = new Set(landingSlugs(type, entries));
  const seen = new Set<string>();
  return entries
    .flatMap((entry) => {
      const slug = entry.code.toLowerCase();
      if (!slugs.has(slug) || seen.has(slug) || !(counts[slug] ?? 0)) {
        return [];
      }
      seen.add(slug);
      return [
        {
          href: landingPath(type, slug),
          label: entry.englishName || entry.name,
        },
      ];
    })
    .sort(byLabel);
}

/** Every network with a landing (`NETWORKS`) */
export const networkChips = (): ReadonlyArray<LandingChip> =>
  NETWORKS.map((network) => ({
    href: landingPath('network', network.slug),
    label: network.name,
  })).sort(byLabel);
