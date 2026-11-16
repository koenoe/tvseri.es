import type { NetworkLandingFacts } from '@tvseri.es/schemas';

type Filter = Readonly<Record<string, string>>;

export type BestOfTab = Readonly<{
  key: string;
  label: string;
  filter: Filter;
}>;

/**
 * "The best of {network}" ("Best of, by…"): a switch the data
 * picks (`facts.bestBy`: decades when 2+ of them hold 6+ shows, else genres),
 * or one plain row when there is nothing to switch between (fewer than two
 * options).
 */
export type BestOf =
  | Readonly<{ kind: 'tabs'; label: string; tabs: ReadonlyArray<BestOfTab> }>
  | Readonly<{ kind: 'plain' }>;

export function bestOf(bestBy: NetworkLandingFacts['bestBy']): BestOf {
  if (bestBy.options.length < 2) {
    return { kind: 'plain' };
  }
  return {
    kind: 'tabs',
    label: bestBy.kind === 'decades' ? 'By decade' : 'By genre',
    tabs: bestBy.options.map(({ filter, key, label }) => ({
      filter,
      key,
      label,
    })),
  };
}
