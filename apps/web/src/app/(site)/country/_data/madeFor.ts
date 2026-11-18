import type { CountryLandingFacts } from '@tvseri.es/schemas';

export type MadeForTab = Readonly<{
  key: string;
  label: string;
  networkId: number;
}>;

/**
 * The second section: "Made for" with a broadcaster switch when the
 * facts name networks (the API leaves `madeFor` empty below 3 qualifying
 * networks), else "Best from {country}" without a switch (as for
 * Denmark).
 */
export type SecondRow =
  | Readonly<{ kind: 'made-for'; tabs: ReadonlyArray<MadeForTab> }>
  | Readonly<{ kind: 'best' }>;

/** The switch needs this many networks (the API's own floor, kept here too) */
const MIN_NETWORKS = 3;

export function secondRow(madeFor: CountryLandingFacts['madeFor']): SecondRow {
  if (madeFor.length < MIN_NETWORKS) {
    return { kind: 'best' };
  }
  return {
    kind: 'made-for',
    tabs: madeFor.map((network) => ({
      key: network.slug,
      label: network.name,
      networkId: network.id,
    })),
  };
}
