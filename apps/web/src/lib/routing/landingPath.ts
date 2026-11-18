import {
  type LandingType,
  landingFilter,
  landingSlugForId,
} from '@tvseri.es/constants';

/**
 * The URL of a Discover landing: `/genre/crime`, `/theme/dystopia`,
 * `/network/hbo`, `/country/gb`, `/decade/2010s`, `/language/ja`.
 */
export default function landingPath(type: LandingType, slug: string): string {
  return `/${type}/${slug}`;
}

type LinkableType = Exclude<LandingType, 'decade'>;

/**
 * The landing for a value a show carries: a TMDB genre, keyword (theme) or
 * network id, or an ISO 3166-1 country / ISO 639-1 language code. Undefined
 * when that value has no landing: render it as text, not a link.
 *
 * @example
 * landingPathFor('genre', 80) // '/genre/crime'
 * landingPathFor('network', 49) // '/network/hbo'
 * landingPathFor('country', 'GB') // '/country/gb'
 */
export function landingPathFor(
  type: LinkableType,
  value: number | string,
): string | undefined {
  if (type === 'genre' || type === 'theme' || type === 'network') {
    const slug = landingSlugForId(type, Number(value));
    return slug ? landingPath(type, slug) : undefined;
  }
  const slug = String(value).toLowerCase();
  return slug && landingFilter(type, slug)
    ? landingPath(type, slug)
    : undefined;
}
