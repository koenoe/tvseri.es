export type CastMember = Readonly<{
  character: string;
  id: number;
  image: string;
  name: string;
  slug: string;
}>;

/** What the search reads of a show in someone's filmography */
export type KnownShow = Readonly<{
  id: number;
  popularity: number;
  voteAverage: number;
  voteCount: number;
}>;

export type ConnectionSource<S extends KnownShow = KnownShow> = Readonly<{
  /** Everyone who acted in a show (all seasons), main cast first */
  castOf: (showId: number) => Promise<ReadonlyArray<CastMember>>;
  /** Whether there is time to start the next round of lookups */
  hasTime: () => boolean;
  /** The shows a person has acted in */
  showsOf: (personId: number) => Promise<ReadonlyArray<S>>;
}>;

export type Link = Readonly<{
  /** The roles the person played in the show before and after them */
  characters: readonly [string, string];
  person: CastMember;
}>;

/** The start, someone from it in `bridge`, someone from there in `end` */
export type Connection<S extends KnownShow = KnownShow> = Readonly<{
  bridge: S;
  end: S;
  links: readonly [Link, Link];
}>;

export type PathSearch<S extends KnownShow = KnownShow> = Readonly<{
  /** Best first, each end once, spread over the shows in between */
  connections: ReadonlyArray<Connection<S>>;
  /** A lookup failed or time ran out: there may be more (or better) paths */
  partial: boolean;
}>;

/** A show's main cast: a link needs a main part on at least one side */
const MAIN_CAST = 15;
/** The start's leads whose other shows are read (the first link) */
const START_PEOPLE = 6;
/** The shows in between whose cast is read */
const MAX_BRIDGES = 4;
/** Per show in between, its leads from outside the start whose other shows are read */
const BRIDGE_PEOPLE = 2;
/** The ends whose cast is read to be sure they share no one with the start */
const ENDS_CHECKED = 10;
/** The paths returned */
export const MAX_PATHS = 8;

/**
 * Every lookup one search can make: the start's cast, its leads' shows, the
 * casts in between, their leads' shows and the ends' casts (29)
 */
export const MAX_LOOKUPS =
  1 + START_PEOPLE + MAX_BRIDGES + MAX_BRIDGES * BRIDGE_PEOPLE + ENDS_CHECKED;

/** An end worth discovering: rated 7 or more by at least this many voters */
const MIN_END_VOTES = 200;
const MIN_END_RATING = 7;
/** The weighted rating's prior: an end counts as this many votes of 7 more */
const PRIOR_VOTES = 500;

const isWellLiked = (show: KnownShow) =>
  show.voteCount >= MIN_END_VOTES && show.voteAverage >= MIN_END_RATING;

/**
 * The rating weighed by its votes (a Bayesian average): 9.4 from 210
 * voters ranks below 8.8 from 20,000
 */
const weightedRating = ({ voteAverage, voteCount }: KnownShow) =>
  (voteCount * voteAverage + PRIOR_VOTES * MIN_END_RATING) /
  (voteCount + PRIOR_VOTES);

/**
 * Whether two casts share someone with a main part on at least one side:
 * the one-step link a two-step path must not hide. Two guest parts are no
 * link (long-running shows share dozens of guest actors).
 */
const shareSomeone = (
  a: ReadonlyArray<CastMember>,
  b: ReadonlyArray<CastMember>,
) => {
  const inB = new Map(b.map((member, index) => [member.id, index]));
  return a.some((member, index) => {
    const other = inB.get(member.id);
    return other !== undefined && (index < MAIN_CAST || other < MAIN_CAST);
  });
};

/** Lookups side by side; a failed one is empty and counted */
const settle = async <T, R>(
  items: ReadonlyArray<T>,
  read: (item: T) => Promise<R>,
  empty: R,
): Promise<Readonly<{ failed: number; values: R[] }>> => {
  const results = await Promise.allSettled(items.map(read));
  return {
    failed: results.filter((result) => result.status === 'rejected').length,
    values: results.map((result) =>
      result.status === 'fulfilled' ? result.value : empty,
    ),
  };
};

/**
 * Takes one item per list in turn (each list's first unused, then their
 * seconds...) until `limit`, never the same key twice
 */
const roundRobin = <T>(
  lists: ReadonlyArray<ReadonlyArray<T>>,
  keyOf: (item: T) => number,
  limit: number,
): T[] => {
  const picked: T[] = [];
  const used = new Set<number>();
  const cursors = lists.map(() => 0);
  let moved = true;
  while (picked.length < limit && moved) {
    moved = false;
    for (const [index, list] of lists.entries()) {
      let cursor = cursors[index]!;
      while (cursor < list.length && used.has(keyOf(list[cursor]!))) {
        cursor++;
      }
      const item = list[cursor];
      cursors[index] = cursor + 1;
      if (item !== undefined && picked.length < limit) {
        picked.push(item);
        used.add(keyOf(item));
        moved = true;
      }
    }
  }
  return picked;
};

type Bridge<S> = Readonly<{
  people: ReadonlyArray<CastMember>;
  /** The start's lead in it, and their part there */
  first: Link;
  show: S;
}>;

type Candidate<S> = Readonly<{
  bridge: Bridge<S>;
  end: S;
  /** The bridge's lead who was in the end */
  second: CastMember;
}>;

/**
 * Two-step paths from a start show to shows worth discovering: the start's
 * leads → the other shows they were in (the shows in between, the most
 * popular first, spread over the leads) → those shows' leads who are NOT in
 * the start → the other shows they were in (the ends). An end is well liked
 * (rated 7+ by 200+ voters, ranked by its weighted rating), is not the start
 * or a show in between, is not in `avoid`, and shares no one with the start
 * (none of the start's leads were in it, and its cast, read, has no one of
 * the start's: else it would be one step). The two people of a path are
 * different people by construction.
 *
 * Bounded: five rounds of lookups side by side, at most MAX_LOOKUPS (29)
 * TMDB calls, whatever the casts. Before each round after the first it asks
 * `hasTime`; out of time or with a failed lookup it answers with what it has,
 * flagged `partial`. An end is only returned once its cast was read.
 */
export const findPathsFrom = async <S extends KnownShow>(
  start: number,
  source: ConnectionSource<S>,
  { avoid = new Set<number>() }: Readonly<{ avoid?: ReadonlySet<number> }> = {},
): Promise<PathSearch<S>> => {
  let failed = 0;
  const outOfTime = (): PathSearch<S> => ({ connections: [], partial: true });

  // The start's cast
  const startRead = await settle([start], source.castOf, []);
  failed += startRead.failed;
  const startCast = startRead.values[0] ?? [];
  const leads = startCast.slice(0, START_PEOPLE);
  if (leads.length === 0) {
    return { connections: [], partial: failed > 0 };
  }
  const inStart = new Set(startCast.map((member) => member.id));

  // The leads' other shows: the candidates in between
  if (!source.hasTime()) {
    return outOfTime();
  }
  const leadShows = await settle(
    leads,
    (lead) => source.showsOf(lead.id),
    [] as ReadonlyArray<S>,
  );
  failed += leadShows.failed;
  // A show a lead of the start was in is never an end: it would be one step
  const withLead = new Set(
    leadShows.values.flatMap((shows) => shows.map((show) => show.id)),
  );
  const bridgeShows = roundRobin(
    leadShows.values.map((shows) =>
      shows
        .filter((show) => show.id !== start)
        .sort((a, b) => b.popularity - a.popularity),
    ),
    (show) => show.id,
    MAX_BRIDGES,
  );
  if (bridgeShows.length === 0) {
    return { connections: [], partial: failed > 0 };
  }

  // The casts in between: the start's lead there, and their leads from outside the start
  if (!source.hasTime()) {
    return outOfTime();
  }
  const bridgeCasts = await settle(
    bridgeShows,
    (show) => source.castOf(show.id),
    [] as ReadonlyArray<CastMember>,
  );
  failed += bridgeCasts.failed;
  const bridges: Bridge<S>[] = bridgeShows.flatMap((show, index) => {
    const cast = bridgeCasts.values[index] ?? [];
    const there = new Map(cast.map((member) => [member.id, member]));
    const lead = leads.find((person) => there.has(person.id));
    const people = cast
      .slice(0, MAIN_CAST)
      .filter((member) => !inStart.has(member.id))
      .slice(0, BRIDGE_PEOPLE);
    if (!lead || people.length === 0) {
      return [];
    }
    const first: Link = {
      characters: [lead.character, there.get(lead.id)?.character ?? ''],
      person: lead,
    };
    return [{ first, people, show }];
  });
  if (bridges.length === 0) {
    return { connections: [], partial: failed > 0 };
  }

  // Their leads' other shows: the candidate ends
  if (!source.hasTime()) {
    return outOfTime();
  }
  const people = [
    ...new Map(
      bridges.flatMap((bridge) => bridge.people.map((p) => [p.id, p])),
    ).values(),
  ];
  const peopleShows = await settle(
    people,
    (person) => source.showsOf(person.id),
    [] as ReadonlyArray<S>,
  );
  failed += peopleShows.failed;
  const showsOfPerson = new Map(
    people.map((person, index) => [person.id, peopleShows.values[index]]),
  );
  const inBetween = new Set(bridges.map((bridge) => bridge.show.id));
  const isEnd = (show: S) =>
    show.id !== start &&
    !inBetween.has(show.id) &&
    !withLead.has(show.id) &&
    !avoid.has(show.id) &&
    isWellLiked(show);
  const perBridge = bridges
    .map((bridge) => {
      const ends = new Map<number, Candidate<S>>();
      for (const second of bridge.people) {
        for (const end of showsOfPerson.get(second.id) ?? []) {
          if (isEnd(end) && !ends.has(end.id)) {
            ends.set(end.id, { bridge, end, second });
          }
        }
      }
      return [...ends.values()].sort(
        (a, b) => weightedRating(b.end) - weightedRating(a.end),
      );
    })
    .filter((candidates) => candidates.length > 0)
    // the bridge with the best end first
    .sort((a, b) => weightedRating(b[0]!.end) - weightedRating(a[0]!.end));
  const picked = roundRobin(
    perBridge,
    (candidate) => candidate.end.id,
    ENDS_CHECKED,
  );
  if (picked.length === 0) {
    return { connections: [], partial: failed > 0 };
  }

  // The ends' casts: none may share someone with the start
  if (!source.hasTime()) {
    return outOfTime();
  }
  const endCasts = await settle(
    picked,
    (candidate) => source.castOf(candidate.end.id),
    null as ReadonlyArray<CastMember> | null,
  );
  failed += endCasts.failed;
  const connections = picked
    .flatMap(({ bridge, end, second }, index): Connection<S>[] => {
      const cast = endCasts.values[index];
      if (!cast || shareSomeone(startCast, cast)) {
        return [];
      }
      // `second`'s part in the end
      const there = cast.find((member) => member.id === second.id);
      return [
        {
          bridge: bridge.show,
          end,
          links: [
            bridge.first,
            {
              characters: [second.character, there?.character ?? ''],
              person: second,
            },
          ],
        },
      ];
    })
    .slice(0, MAX_PATHS);

  return { connections, partial: failed > 0 };
};
