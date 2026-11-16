import type { SeriesFacts, WhereToStartPick } from '@tvseri.es/schemas';

import { isEnded } from './buckets';

const NIGHT_MAX_MINUTES = 300;
const WEEKEND_MAX_MINUTES = 600;

const minutes = (facts: SeriesFacts) => facts.totalRuntime ?? Number.NaN;

const ranked = (
  facts: ReadonlyArray<SeriesFacts>,
  by: 'voteAverage' | 'voteCount',
) => [...facts].sort((a, b) => b[by] - a[by]);

type Slot = Readonly<{
  kind: WhereToStartPick['kind'];
  candidates: ReadonlyArray<SeriesFacts>;
  by: 'voteAverage' | 'voteCount';
}>;

/** The slots in order: a night (a country: its favourite), a weekend, the long haul */
const slotsOf = (
  pool: ReadonlyArray<SeriesFacts>,
  country: boolean,
): ReadonlyArray<Slot> => {
  const ended = pool.filter(isEnded);
  return [
    country
      ? { by: 'voteCount', candidates: pool, kind: 'favourite' }
      : {
          by: 'voteAverage',
          candidates: ended.filter(
            (facts) => minutes(facts) <= NIGHT_MAX_MINUTES,
          ),
          kind: 'night',
        },
    {
      by: 'voteAverage',
      candidates: ended.filter(
        (facts) =>
          minutes(facts) > NIGHT_MAX_MINUTES &&
          minutes(facts) <= WEEKEND_MAX_MINUTES,
      ),
      kind: 'weekend',
    },
    {
      by: 'voteCount',
      candidates: pool.filter((facts) => facts.seasons.length >= 5),
      kind: 'long-haul',
    },
  ];
};

/**
 * Which show each Where to start slot shows: a night (or, for a country, its
 * favourite), a weekend and the long haul. A show is picked once: a slot takes
 * the best candidate no earlier slot took, and is left out when none is left
 * (a small country has fewer slots, not a repeat).
 */
export function chooseStartPicks(
  pool: ReadonlyArray<SeriesFacts>,
  country: boolean,
): ReadonlyArray<readonly [WhereToStartPick['kind'], SeriesFacts]> {
  const taken = new Set<number>();
  return slotsOf(pool, country).flatMap(({ by, candidates, kind }) => {
    const found = ranked(candidates, by).find((facts) => !taken.has(facts.id));
    if (!found) {
      return [];
    }
    taken.add(found.id);
    return [[kind, found] as const];
  });
}

/**
 * The next best shows for each slot that has a pick, up to `perSlot` each,
 * never a pick or another backup: a landing whose rows above already show a
 * pick fills that slot from these, so it keeps its three cards (a block
 * needs three posters).
 */
export function chooseStartBackups(
  pool: ReadonlyArray<SeriesFacts>,
  country: boolean,
  picks: ReadonlyArray<readonly [WhereToStartPick['kind'], SeriesFacts]>,
  perSlot: number,
): ReadonlyArray<readonly [WhereToStartPick['kind'], SeriesFacts]> {
  const taken = new Set(picks.map(([, facts]) => facts.id));
  const picked = new Set(picks.map(([kind]) => kind));
  return slotsOf(pool, country)
    .filter(({ kind }) => picked.has(kind))
    .flatMap(({ by, candidates, kind }) =>
      ranked(candidates, by)
        .filter((facts) => !taken.has(facts.id))
        .slice(0, perSlot)
        .map((facts) => {
          taken.add(facts.id);
          return [kind, facts] as const;
        }),
    );
}

/**
 * Whether a pick is its slot's best candidate in the whole pool: a show an
 * earlier slot took can push a slot to its second best, which is then
 * "among" the most-voted, not "the".
 */
export function isSlotTop(
  pool: ReadonlyArray<SeriesFacts>,
  country: boolean,
  kind: WhereToStartPick['kind'],
  id: number,
): boolean {
  const slot = slotsOf(pool, country).find(
    (candidate) => candidate.kind === kind,
  );
  return slot ? ranked(slot.candidates, slot.by)[0]?.id === id : false;
}
