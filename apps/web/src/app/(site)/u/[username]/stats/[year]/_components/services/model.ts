import type { StatsProviderItem } from '@tvseri.es/schemas';
import { plural } from '@tvseri.es/utils';
import { fitNames, withMore } from '@/lib/text/fitNames';

export type ProviderInput = StatsProviderItem;

/** A service from the profile's list (`user.watchProviders`) */
export type ListedService = Readonly<{
  id: number;
  name: string;
  logo: string;
}>;

/**
 * Where a service stands against the profile's own list: synced from Plex,
 * in the list, or not in it.
 */
export type ServiceStatus = 'plex' | 'listed' | 'unlisted';

export type UsedService = Readonly<{
  key: string;
  name: string;
  logo: string | null;
  /** "Billions, Barry, The Pitt and 30 more", "Bought, not streamed"; null: no line */
  line: string | null;
  /** "33 shows" */
  shows: string;
  /** Width of the bar, in percent of the top service (one decimal) */
  bar: number;
  status: ServiceStatus;
}>;

/** A listed service with nothing logged in the year: dimmed */
export type UnusedService = Readonly<{
  key: string;
  name: string;
  logo: string | null;
  line: string;
}>;

export type Services = Readonly<{
  /** Services used in the year (the lane's badge) */
  count: number;
  used: ReadonlyArray<UsedService>;
  unused: ReadonlyArray<UnusedService>;
}>;

const normal = (name: string) => name.trim().toLowerCase();

/**
 * A store where a show is bought or rented, not streamed: exactly "Apple TV"
 * (not "Apple TV+"), or a name containing "Store", "Google Play" or "Amazon
 * Video".
 */
export function isStoreProvider(name: string): boolean {
  const lower = normal(name);
  return (
    lower === 'apple tv' ||
    lower.includes('store') ||
    lower.includes('google play') ||
    lower.includes('amazon video')
  );
}

/** The desktop column the line sits in (230px) */
const SERIES_LINE_PX = 230;

/**
 * "Billions, Barry, The Pitt and 30 more": the provider's top series (at
 * most 3, from the API), as many as fit the column, then how many more
 * there are, so the line never clips. Null without names.
 */
export function seriesLine(
  series: ProviderInput['series'],
  count: number,
  maxWidth: number = SERIES_LINE_PX,
): string | null {
  if (!series || series.length === 0) {
    return null;
  }
  return fitNames(
    series.map((item) => item.title),
    (shown) => withMore(shown, count),
    { maxWidth },
  );
}

const percent = (value: number) => Math.round(value * 1000) / 10;

/**
 * "Services": the providers the year's series were watched on, the most
 * used first, each against the profile's list; then the listed services that
 * weren't used.
 */
export function buildServices(
  providers: ReadonlyArray<ProviderInput>,
  listed: ReadonlyArray<ListedService>,
  year: number,
): Services {
  const listedNames = new Set(listed.map((service) => normal(service.name)));
  const sorted = providers
    .filter((provider) => provider.count > 0)
    .slice()
    .sort((a, b) => b.count - a.count);
  const top = sorted[0]?.count ?? 0;
  const used = sorted.map((provider): UsedService => {
    const name = normal(provider.name);
    const status: ServiceStatus =
      name === 'plex' ? 'plex' : listedNames.has(name) ? 'listed' : 'unlisted';
    return {
      bar: percent(provider.count / top),
      key: provider.name,
      line: isStoreProvider(provider.name)
        ? 'Bought, not streamed'
        : seriesLine(provider.series, provider.count),
      logo: provider.logo,
      name: provider.name,
      shows: plural(provider.count, 'series', 'series'),
      status,
    };
  });
  const usedNames = new Set(sorted.map((provider) => normal(provider.name)));
  const unused = listed
    .filter((service) => !usedNames.has(normal(service.name)))
    .map(
      (service): UnusedService => ({
        key: service.name,
        line: `Nothing logged in ${year}`,
        logo: service.logo || null,
        name: service.name,
      }),
    );
  return { count: used.length, unused, used };
}
