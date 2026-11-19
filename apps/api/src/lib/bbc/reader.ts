import { BBC_IPLAYER_WATCH_PROVIDER } from '@tvseri.es/constants';
import { bbcRow, isWatched } from '@tvseri.es/import';
import type { ConnectionLatest } from '@tvseri.es/schemas';
import { chunk } from '@tvseri.es/utils';

import { readFailure } from '@/lib/connections/http';
import {
  type CookieJar,
  cookieJar,
  jarSecret,
  openJar,
  secretFromCookies,
} from '@/lib/connections/jar';
import { createPacer } from '@/lib/connections/pace';
import {
  type HistoryEntry,
  type HistoryPage,
  MAX_FAILED_LOOKUPS,
  NO_PROFILE,
  type ReadFailure,
  type ServiceReader,
} from '@/lib/connections/reader';

import {
  type ActivityPlay,
  PLAYS_PER_PAGE,
  readActivityPage,
} from './activity';
import {
  BBC_SITE,
  type BbcEpisode,
  readEpisodes,
  readProgramme,
} from './iplayer';

/**
 * BBC iPlayer for the sync. A play is dated by its latest event, so a rewatch
 * moves an episode to the top with a later date; the write path keeps the
 * date it stored first. The account has no profiles: a placeholder is stored.
 */

/** /programmes lookups at once, for episodes iPlayer no longer has */
const LOOKUPS_AT_ONCE = 4;

const LATEST_LOOKUPS = 20;

const LABEL = 'BBC IPLAYER SYNC';

/** A live stream's `ended` only means the stream stopped: it counts by a position past the credits */
const watched = (play: ActivityPlay, episode: BbcEpisode) =>
  play.live
    ? play.offset !== null &&
      isWatched(
        { action: 'live', offset: play.offset },
        episode.durationSeconds,
      )
    : isWatched(
        { action: play.action, offset: play.offset ?? 0 },
        episode.durationSeconds,
      );

/** iPlayer's catalogue being down, or /programmes on several PIDs, fails the page */
const episodesOf = async (
  plays: ReadonlyArray<ActivityPlay>,
): Promise<
  | Readonly<{ ok: true; episodes: ReadonlyMap<string, BbcEpisode> }>
  | ReadFailure
> => {
  // A live play without a position can't count: no need to know it
  const asked = plays.filter((play) => !play.live || play.offset !== null);
  const catalogue = await readEpisodes([
    ...new Set(asked.map((play) => play.pid)),
  ]);
  if (!catalogue.ok) {
    return catalogue;
  }
  const episodes = new Map(catalogue.episodes);
  const missing = asked.filter((play) => !episodes.has(play.pid));
  let failed = 0;
  for (const batch of chunk(missing, LOOKUPS_AT_ONCE)) {
    const found = await Promise.all(
      batch.map((play) => readProgramme(play.pid, play.versionPid)),
    );
    for (const episode of found) {
      if (episode === 'unavailable') {
        failed += 1;
      } else if (episode !== 'unknown') {
        episodes.set(episode.id, episode);
      }
    }
    if (failed >= MAX_FAILED_LOOKUPS) {
      return readFailure('unavailable');
    }
  }
  if (failed > 0) {
    console.warn(
      `[${LABEL}] ${failed} episodes left out: /programmes was busy or down`,
    );
  }
  return { episodes, ok: true };
};

type WatchedPlay = Readonly<{
  episode: BbcEpisode;
  /** The play's place in the whole history */
  index: number;
  play: ActivityPlay;
}>;

const watchedPlays = (
  plays: ReadonlyArray<ActivityPlay>,
  episodes: ReadonlyMap<string, BbcEpisode>,
  firstIndex: number,
) => {
  const list: WatchedPlay[] = [];
  let unknown = 0;
  plays.forEach((play, at) => {
    const episode = episodes.get(play.pid);
    if (!episode) {
      unknown += play.live && play.offset === null ? 0 : 1;
      return;
    }
    if (watched(play, episode)) {
      list.push({ episode, index: firstIndex + at, play });
    }
  });
  return { list, unknown };
};

const readWatched = async (
  jar: CookieJar,
  page: number,
): Promise<Readonly<{ ok: true; page: HistoryPage }> | ReadFailure> => {
  const read = await readActivityPage(jar, page);
  if (!read.ok) {
    return read;
  }
  if (read.end) {
    return { ok: true, page: { entries: [], invalid: 0 } };
  }
  if (read.plays.length === 0 && read.invalid > 0) {
    return readFailure('changed');
  }
  const catalogue = await episodesOf(read.plays);
  if (!catalogue.ok) {
    return catalogue;
  }
  const { list, unknown } = watchedPlays(
    read.plays,
    catalogue.episodes,
    page * PLAYS_PER_PAGE,
  );
  if (unknown > 0) {
    console.warn(
      `[${LABEL}] ${unknown} plays left out: no catalogue knows them | Page: ${page}`,
    );
  }
  const entries: HistoryEntry[] = list.map(({ episode, index, play }) => ({
    key: play.pid,
    row: bbcRow(episode, index, play.watchedAt),
    watchedAt: play.watchedAt,
  }));
  // A page of plays not yet watched has no entries but isn't the end; a
  // page without any play is
  const more = read.plays.length + read.invalid > 0;
  return { ok: true, page: { entries, invalid: read.invalid, more } };
};

const latestOf = async (
  plays: ReadonlyArray<ActivityPlay>,
): Promise<ConnectionLatest | null> => {
  const newest = plays.slice(0, LATEST_LOOKUPS);
  const catalogue = await episodesOf(newest);
  if (!catalogue.ok) {
    return null;
  }
  const [first] = watchedPlays(newest, catalogue.episodes, 0).list;
  if (!first) {
    return null;
  }
  const { episode, play } = first;
  const isEpisode = bbcRow(episode, 0, play.watchedAt) !== null;
  return {
    episodeTitle: isEpisode ? episode.subtitle : null,
    title: episode.title,
    watchedAt: play.watchedAt,
  };
};

export const bbcReader: ServiceReader = {
  label: LABEL,
  link: async (cookies) => {
    const jar = cookieJar(cookies, BBC_SITE);
    const read = await readActivityPage(jar, 0);
    if (!read.ok) {
      return read;
    }
    return {
      // The overview is a nicety: a catalogue outage doesn't stop the link
      latest: await latestOf(read.plays),
      ok: true,
      profileId: NO_PROFILE,
      profileName: null,
      secret: secretFromCookies(jar.cookies()),
      total: read.end ? 0 : (read.total ?? read.plays.length),
    };
  },
  open: async (secret) => {
    const jar = openJar(secret, BBC_SITE);
    if (!jar) {
      return readFailure('read-failed');
    }
    // A resumed run's pages never go back to back
    const pace = createPacer();
    return {
      ok: true,
      session: {
        readPage: async (page) => {
          await pace();
          return readWatched(jar, page);
        },
        // Whatever the BBC renews on a read is stored after the page
        get secret() {
          return jarSecret(jar, secret);
        },
      },
    };
  },
  watchProvider: BBC_IPLAYER_WATCH_PROVIDER,
};
