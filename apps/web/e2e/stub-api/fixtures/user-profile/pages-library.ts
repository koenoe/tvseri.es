import type {
  CreateListItem,
  LibraryItem,
  LibraryProgress,
  LibraryShelf,
} from '@tvseri.es/schemas';
import {
  type LibraryEntry,
  shelfDate,
  shelvesOf,
  toLibraryIds,
} from '@tvseri.es/utils';

import { type ListName, listItems } from './library.ts';
import { PG_SHOW_COUNT, pgShowById, pgShows, seeded } from './pages-shows.ts';
import type { PersonName } from './people.ts';
import {
  bulkKeys,
  type ProfileShow,
  type ShowKey,
  showById,
  showOf,
} from './shows.ts';
import { daysAgo } from './time.ts';

/**
 * The Library per person: every show a person has on a list,
 * merged into `LibraryEntry`s (the shape `@tvseri.es/utils` pages), plus
 * the writes a test makes (list adds and removes, Hide and Unhide). The
 * module is loaded once per test namespace, so the writes are that test's.
 *
 * - Everyone's lists are the list routes' (`library.ts`, same dates), so the
 *   overview and the Library agree; a few people get older extras after them.
 * - alex hides two In progress shows (Hidden shelf: one this year, one 2025).
 * - juno (alex visiting): favourites new to alex (`bulk40`–`bulk44`), shared
 *   finished (Pitt, Severance, McMafia), shows on alex's watchlist only
 *   (Frieren, Haikyu, Witch Hat, X-Men) and shows both favourited.
 * - the circle: each followed person watches something; oskar's latest is
 *   hidden; rumi has nothing in progress.
 * - `marathonwatcher-2026`: its own 320-show library (`pages-shows.ts`): 60 in
 *   progress (12 hidden), 48 on the watchlist over three years, 210
 *   finished, 98 favourites across finished and watching.
 * - `seenit`: two finished shows.
 */

const HEAVY = 'marathonwatcher-2026';
const DAY = 86_400_000;

type Dates = {
  watchlistAt: number | null;
  favouriteAt: number | null;
  finishedAt: number | null;
  activeAt: number | null;
};

type Show = Readonly<{
  id: number;
  title: string;
  slug: string;
  posterPath: string | null;
  posterImage: string;
}>;

const LIST_FIELD = {
  favorites: 'favouriteAt',
  in_progress: 'activeAt',
  watched: 'finishedAt',
  watchlist: 'watchlistAt',
} as const satisfies Record<ListName, keyof Dates>;

const fromProfileShow = (show: ProfileShow): Show => ({
  id: show.id,
  posterImage: show.poster,
  posterPath: show.poster ? `/${show.poster.split('/').pop()}` : null,
  slug: show.slug || `show-${show.id}`,
  title: show.title,
});

/** Any show the profile fixtures know, by id */
export const catalogueShow = (id: number): ProfileShow | undefined =>
  pgShowById(id) ?? showById(id);

// ── seeds ───────────────────────────────────────────────────────────────

type Seed = Readonly<{
  shows: Map<number, Show>;
  dates: Map<number, Dates>;
  hidden: Map<number, number>;
}>;

const emptyDates = (): Dates => ({
  activeAt: null,
  favouriteAt: null,
  finishedAt: null,
  watchlistAt: null,
});

const newSeed = (): Seed => ({
  dates: new Map(),
  hidden: new Map(),
  shows: new Map(),
});

const put = (seed: Seed, show: Show, field: keyof Dates, at: number) => {
  seed.shows.set(show.id, show);
  const dates = seed.dates.get(show.id) ?? emptyDates();
  dates[field] = at;
  seed.dates.set(show.id, dates);
};

/** Library-only extras, older than every list item (so list pages keep their first rows) */
type Extra = Readonly<{
  key: ShowKey;
  lists: ReadonlyArray<ListName>;
}>;

const EXTRAS: Partial<Record<PersonName, ReadonlyArray<Extra>>> = {
  bea: [
    { key: 'whiteLotus', lists: ['in_progress'] },
    { key: 'severance', lists: ['watched', 'favorites'] },
  ],
  juno: [
    ...bulkKeys(40, 43).map(
      (key): Extra => ({ key, lists: ['favorites', 'watched'] }),
    ),
    { key: 'bulk43', lists: ['watched'] },
    { key: 'bulk44', lists: ['in_progress', 'favorites'] },
  ],
  leo: [{ key: 'theChosen', lists: ['in_progress'] }],
  noor: [{ key: 'gildedAge', lists: ['in_progress'] }],
  oskar: [
    // the latest is hidden: oskar is watching the one before it
    { key: 'ringsOfPower', lists: ['in_progress'] },
    { key: 'gildedAge', lists: ['in_progress'] },
  ],
  rumi: [
    { key: 'blackDoves', lists: ['watched'] },
    { key: 'mobland', lists: ['watched', 'favorites'] },
  ],
  seenit: [
    { key: 'severance', lists: ['watched'] },
    { key: 'pitt', lists: ['watched'] },
  ],
  tamsin: [
    { key: 'shogun', lists: ['in_progress', 'favorites'] },
    { key: 'lastOfUs', lists: ['watched'] },
  ],
};

/** Hidden In progress shows (prefs `paused: 'hide'`), with when they were hidden */
const HIDDEN: Partial<Record<PersonName, ReadonlyArray<[ShowKey, number]>>> = {
  alex: [
    ['theChosen', daysAgo(40)],
    ['midsomer', Date.UTC(2025, 4, 10, 20)],
  ],
  oskar: [['ringsOfPower', daysAgo(1)]],
};

const LISTS: ReadonlyArray<ListName> = [
  'in_progress',
  'watched',
  'favorites',
  'watchlist',
];

const listSeed = (name: PersonName): Seed => {
  const seed = newSeed();
  let oldest = Number.POSITIVE_INFINITY;
  for (const list of LISTS) {
    for (const item of listItems(name, list)) {
      const show = showById(item.id);
      if (show) {
        put(seed, fromProfileShow(show), LIST_FIELD[list], item.createdAt);
        oldest = Math.min(oldest, item.createdAt);
      }
    }
  }
  const start = Number.isFinite(oldest) ? oldest : daysAgo(3);
  (EXTRAS[name] ?? []).forEach(({ key, lists }, index) => {
    for (const list of lists) {
      put(
        seed,
        fromProfileShow(showOf(key)),
        LIST_FIELD[list],
        start - (index + 1) * 5 * DAY - (list === 'favorites' ? DAY : 0),
      );
    }
  });
  for (const [key, at] of HIDDEN[name] ?? []) {
    seed.hidden.set(showOf(key).id, at);
  }
  return seed;
};

/** The heavy Library: roles from a seeded shuffle, dates over three years */
const heavySeed = (): Seed => {
  const seed = newSeed();
  const random = seeded(2026);
  const order = Array.from({ length: PG_SHOW_COUNT }, (_, index) => index);
  for (let index = order.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [order[index], order[other]] = [order[other] ?? 0, order[index] ?? 0];
  }
  const between = (from: number, to: number) =>
    Math.round((from + random() * (to - from)) / 60_000) * 60_000;
  const shows = pgShows();
  const role = (from: number, to: number) =>
    order.slice(from, to).map((index) => fromProfileShow(shows[index]!));

  const inProgress = role(0, 60);
  const finished = role(60, 270);
  const watchlist = role(270, 318);
  const favouriteOnly = role(318, 320);

  inProgress.forEach((show, index) => {
    // most this year, a few last year (a show you stopped)
    const at =
      index < 50
        ? between(Date.UTC(2026, 0, 2), Date.UTC(2026, 10, 1))
        : between(Date.UTC(2025, 1, 1), Date.UTC(2025, 11, 20));
    put(seed, show, 'activeAt', at);
    if (index % 5 === 2 && seed.hidden.size < 12) {
      seed.hidden.set(
        show.id,
        seed.hidden.size < 8
          ? between(at, Date.UTC(2026, 10, 5))
          : between(Date.UTC(2025, 0, 5), Date.UTC(2025, 11, 1)),
      );
    }
    if (index < 26) {
      put(seed, show, 'favouriteAt', at - 30 * DAY);
    }
  });
  finished.forEach((show, index) => {
    const at = between(Date.UTC(2024, 0, 10), Date.UTC(2026, 9, 30));
    put(seed, show, 'finishedAt', at);
    if (index % 3 === 0) {
      put(seed, show, 'favouriteAt', at + DAY);
    }
  });
  watchlist.forEach((show) => {
    put(
      seed,
      show,
      'watchlistAt',
      between(Date.UTC(2023, 10, 15), Date.UTC(2026, 10, 1)),
    );
  });
  for (const show of favouriteOnly) {
    put(
      seed,
      show,
      'favouriteAt',
      between(Date.UTC(2024, 5, 1), Date.UTC(2026, 5, 1)),
    );
  }
  return seed;
};

// ── the store: seeds plus this namespace's writes ───────────────────────

const seeds = new Map<PersonName, Seed>();

const seedOf = (name: PersonName): Seed => {
  let seed = seeds.get(name);
  if (!seed) {
    seed = name === HEAVY ? heavySeed() : listSeed(name);
    seeds.set(name, seed);
  }
  return seed;
};

/** Every show of a person's library, merged (`hiddenAt` only while In progress) */
export const entriesOf = (name: PersonName): LibraryEntry[] => {
  const seed = seedOf(name);
  return [...seed.dates]
    .filter(([, dates]) => Object.values(dates).some((at) => at !== null))
    .map(([id, dates]) => {
      const show = seed.shows.get(id)!;
      const hiddenAt = seed.hidden.get(id) ?? null;
      return {
        ...dates,
        hiddenAt: dates.activeAt !== null ? hiddenAt : null,
        id,
        posterPath: show.posterPath,
        slug: show.slug,
        title: show.title,
      };
    });
};

/** `POST /user/:id/list/:list` (favourites, watchlist): Undo sends the original `createdAt` */
export const addToList = (
  name: PersonName,
  list: 'favorites' | 'watchlist',
  body: Partial<CreateListItem>,
) => {
  const id = Number(body.id);
  if (!Number.isSafeInteger(id)) {
    return;
  }
  const seed = seedOf(name);
  const known = seed.shows.get(id);
  const catalogue = catalogueShow(id);
  put(
    seed,
    known ??
      (catalogue
        ? fromProfileShow(catalogue)
        : {
            id,
            posterImage: '',
            posterPath: body.posterPath ?? null,
            slug: body.slug ?? `show-${id}`,
            title: body.title ?? `Show ${id}`,
          }),
    LIST_FIELD[list],
    typeof body.createdAt === 'number' ? body.createdAt : Date.now(),
  );
};

/** `DELETE /user/:id/list/:list/:id` */
export const removeFromList = (
  name: PersonName,
  list: 'favorites' | 'in_progress' | 'watchlist',
  id: number,
) => {
  const dates = seedOf(name).dates.get(id);
  if (dates) {
    dates[LIST_FIELD[list]] = null;
  }
};

/** `PATCH /me/series/:id/prefs` `{ paused }`: Hide stamps `pausedAt`, anything else clears it */
export const setPaused = (
  name: PersonName,
  id: number,
  paused: 'keep' | 'hide' | null,
) => {
  const { hidden } = seedOf(name);
  if (paused === 'hide') {
    hidden.set(id, Date.now());
  } else {
    hidden.delete(id);
  }
};

// ── what the routes answer ──────────────────────────────────────────────

const code = (season: number, episode: number) =>
  `S${String(season).padStart(2, '0')}E${String(episode).padStart(2, '0')}`;

const perSeasonOf = (show: ProfileShow) =>
  Math.max(1, Math.ceil(show.episodes / show.seasons));

/** Episodes per season, in the split every progress code counts in */
export const seasonSizes = (show: ProfileShow): number[] => {
  const perSeason = perSeasonOf(show);
  return Array.from({ length: show.seasons }, (_, index) =>
    Math.max(0, Math.min(perSeason, show.episodes - index * perSeason)),
  );
};

const codeAt = (show: ProfileShow, index: number) => {
  const perSeason = perSeasonOf(show);
  return {
    code: code(
      Math.floor((index - 1) / perSeason) + 1,
      ((index - 1) % perSeason) + 1,
    ),
    season: Math.floor((index - 1) / perSeason) + 1,
  };
};

/** The owner's progress in an In progress show: deterministic per show */
export const progressOf = (show: ProfileShow): LibraryProgress => {
  const random = seeded(show.id);
  const total = show.episodes;
  const airing = show.status === 'Returning Series' && show.id % 2 === 0;
  const aired = airing ? Math.max(1, total - 1 - (show.id % 3)) : total;
  const watched = Math.max(
    1,
    Math.min(aired, Math.round(aired * (0.1 + random() * 0.85))),
  );
  const last = codeAt(show, watched);
  return {
    aired,
    airing,
    lastSeason: last.season,
    lastWatched: last.code,
    next: watched < aired ? codeAt(show, watched + 1).code : null,
    total,
    toWatch: aired - watched,
    watched,
  };
};

/**
 * How many of a show's first episodes the seeds count as watched: the
 * Library's progress while In progress, every aired one once finished. The
 * marking routes start a person's show from these (`show/store.ts`).
 */
export const seededWatchedCount = (name: PersonName, id: number): number => {
  const dates = seedOf(name).dates.get(id);
  const show = catalogueShow(id);
  if (!dates || !show) {
    return 0;
  }
  const progress = progressOf(show);
  if (dates.activeAt !== null) {
    return progress.watched;
  }
  return dates.finishedAt !== null ? progress.aired : 0;
};

/** Watched fraction per show, for "Most left" */
export const progressFractions = (entries: ReadonlyArray<LibraryEntry>) =>
  new Map(
    entries.flatMap((entry) => {
      const show = catalogueShow(entry.id);
      if (!show || entry.activeAt === null) {
        return [];
      }
      const progress = progressOf(show);
      return [[entry.id, progress.watched / progress.aired] as const];
    }),
  );

const PROGRESS_SHELVES: ReadonlyArray<LibraryShelf> = [
  'watching',
  'hidden',
  'favourites',
];

/** One tile as the API answers it */
export const toLibraryItem = (
  name: PersonName,
  entry: LibraryEntry,
  shelf: LibraryShelf,
  owner: boolean,
): LibraryItem => {
  const show = catalogueShow(entry.id);
  return {
    addedAt: shelfDate(entry, shelf),
    facts: show
      ? {
          hasAired: true,
          seasonCount: show.seasons,
          status: show.status,
          totalRuntime: show.runtime * show.episodes,
          type: show.type,
        }
      : null,
    finishedAt: entry.finishedAt,
    hiddenAt: owner ? entry.hiddenAt : null,
    id: entry.id,
    on: shelvesOf(entry, { owner }),
    posterImage:
      seedOf(name).shows.get(entry.id)?.posterImage ?? show?.poster ?? '',
    progress:
      show && entry.activeAt !== null && PROGRESS_SHELVES.includes(shelf)
        ? progressOf(show)
        : null,
    slug: entry.slug,
    title: entry.title,
    // Finished and Favourites draw the finished date; seenit's shows were
    // marked "Seen it" (every episode undated): "Seen, no date"
    ...(shelf === 'finished' || shelf === 'favourites'
      ? { undated: entry.finishedAt !== null && UNDATED_ONLY.has(name) }
      : {}),
  };
};

/** People whose finished shows were only marked "Seen it" (no dates) */
const UNDATED_ONLY: ReadonlySet<PersonName> = new Set(['seenit']);

/** The viewer's lists, as the visitor filters read them */
export const libraryIdsOf = (name: PersonName) => toLibraryIds(entriesOf(name));

/** The heavy Library's shows by role, for the diary */
export const heavyShows = () => {
  const entries = entriesOf(HEAVY);
  const pick = (test: (entry: LibraryEntry) => boolean) =>
    entries
      .filter(test)
      .map((entry) => catalogueShow(entry.id)!)
      .sort((a, b) => a.id - b.id);
  return {
    finished: pick((entry) => entry.finishedAt !== null),
    inProgress: pick((entry) => entry.activeAt !== null),
  };
};
