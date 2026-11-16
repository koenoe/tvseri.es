import type { CatchingUpItem, Overview } from '@tvseri.es/schemas';

import { alexOverview, emptyOverview } from './overview.ts';
import { identity, img } from './shows.ts';
import { day, daysAgo } from './time.ts';

/**
 * rae's tracker: the V60 "every component, every state" sheet in one
 * profile. `/u/rae` draws the first Up next (a full season out); the other
 * Up next states are tiles at `/u/rae/in-progress`. Catching up shows its
 * four runway states, Out now a season that just completed, and the rest
 * (Almost done, Paused, the ledger) is alex's so presses can be tried.
 */

const catching = (
  key: Parameters<typeof identity>[0],
  runway: CatchingUpItem['runway'],
): CatchingUpItem => ({
  ...identity(key),
  episodeRuntimes: [58, 58, 58, 58],
  episodes: ['S05E05', 'S05E06', 'S05E07', 'S05E08'],
  nextUp: 'S05E05',
  runtime: 58,
  runtimeMinutes: 232,
  runway,
  waiting: 4,
});

export const raeOverview = (): Overview => {
  const alex = alexOverview();
  const [airing] = alex.upNext;
  return {
    ...alex,
    catchingUp: [
      // comfortable: days to go
      catching('theChosen', {
        date: day(6),
        daysToGo: 6,
        season: 6,
        state: 'upcoming',
      }),
      // tight: a day or less (the date in pink)
      catching('severance', {
        date: day(1),
        daysToGo: 1,
        season: 3,
        state: 'upcoming',
      }),
      // missed: the next season is already out
      catching('wednesday', {
        date: day(-9),
        daysToGo: 0,
        season: 6,
        state: 'out',
      }),
      // no date yet
      catching('whiteLotus', null),
    ],
    outNow: [
      {
        ...identity('gildedAge'),
        airDate: day(0),
        episodes: 8,
        kind: 'season-complete',
        runtimeMinutes: 496,
        season: 4,
      },
      ...alex.outNow.slice(1),
    ],
    upNext: [
      // full season out: how much is left
      {
        ...identity('theChosen'),
        airDate: '2025-04-20',
        code: 'S05E05',
        episode: 5,
        episodeTitle: 'The Last Supper, Part 1',
        isLatest: false,
        lastWatchedAt: daysAgo(17),
        lastWatchedCode: 'S05E04',
        nextSeasonTba: false,
        nextToAir: null,
        runtime: 58,
        season: 5,
        seasonFinale: false,
        seasonTotal: 8,
        seasonWatched: 4,
        timeLeftMinutes: 232,
        toWatch: 4,
      },
      // season finale next, no next season yet
      {
        ...identity('blackDoves'),
        airDate: day(-30),
        code: 'S02E06',
        episode: 6,
        episodeTitle: 'Episode 6',
        isLatest: false,
        lastWatchedAt: daysAgo(5),
        lastWatchedCode: 'S02E05',
        nextSeasonTba: true,
        nextToAir: null,
        runtime: 52,
        season: 2,
        seasonFinale: true,
        seasonTotal: 6,
        seasonWatched: 5,
        timeLeftMinutes: 52,
        toWatch: 1,
      },
      // airing: latest episode, tick where airing stops
      ...(airing ? [airing] : []),
    ],
  };
};

/** "S07E07": a code of The Long Run's 200-episode season */
const longRunCode = (episode: number) =>
  `S07E${String(episode).padStart(2, '0')}`;

/**
 * kit's Catching up: The Long Run (the show stub's 900002, so its chips mark
 * through the marking routes) with the owner's real-data shape, 84 episodes
 * waiting in one long season and the API's eight codes from S07E07. The
 * show stub has none of them watched for kit.
 */
const kitCatchingUp = (): CatchingUpItem => ({
  episodeRuntimes: Array.from({ length: 8 }, () => 44),
  episodes: Array.from({ length: 8 }, (_, index) => longRunCode(7 + index)),
  nextUp: longRunCode(7),
  posterImage: img('ds_wire_p.jpg'),
  runtime: 44,
  runtimeMinutes: 84 * 44,
  runway: null,
  seriesId: 900002,
  slug: 'the-long-run',
  title: 'The Long Run',
  waiting: 84,
});

/**
 * kit's tracker: The Bear as the show stub seeds it (season 1, season 2 with
 * E05 skipped, season 3 to E04), so Next up is S03E05 "Children" both here
 * and in the marking store; then Dexter from alex's. Catching up has The
 * Long Run (`kitCatchingUp`).
 */
export const kitOverview = (): Overview => {
  const [dexter] = alexOverview().upNext;
  return {
    ...emptyOverview(),
    catchingUp: [kitCatchingUp()],
    upNext: [
      {
        airDate: '2024-06-26',
        code: 'S03E05',
        episode: 5,
        episodeTitle: 'Children',
        isLatest: false,
        lastWatchedAt: Date.parse('2025-07-05T22:02:00.000Z'),
        lastWatchedCode: 'S03E04',
        nextSeasonTba: false,
        nextToAir: null,
        posterImage: img('ep_bear_bd.jpg'),
        runtime: 34,
        season: 3,
        seasonFinale: false,
        seasonTotal: 10,
        seasonWatched: 4,
        seriesId: 136315,
        slug: 'the-bear',
        timeLeftMinutes: 204,
        title: 'The Bear',
        toWatch: 6,
      },
      ...(dexter ? [dexter] : []),
    ],
  };
};
