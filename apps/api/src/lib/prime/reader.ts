import { createHash } from 'node:crypto';

import { PRIME_VIDEO_WATCH_PROVIDER } from '@tvseri.es/constants';
import { primeEpisode, primeRow, primeSeason } from '@tvseri.es/import';
import { type ConnectionLatest, UnresolvedKeySchema } from '@tvseri.es/schemas';
import * as v from 'valibot';

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
  type PageCursor,
  type ReadFailure,
  type ReadPageOptions,
  type ServiceReader,
} from '@/lib/connections/reader';

import {
  detailId,
  type HistoryAnswer,
  type PrimeEntry,
  parseEntry,
  readActiveProfile,
  readHistoryPage,
  readSeasonDetail,
  type SeasonDetail,
  SITE,
  seasonFrom,
} from './watchHistory';

/**
 * Prime Video for the sync. A page is flattened to episodes and films in time
 * order: a season's episodes can be older than the next title, and the sync
 * stops at the first entry past its cut-off. The history is the active
 * profile's, so every sync checks the session is still on the linked one.
 * An entry is remembered by its title id (`gti`).
 */

const LABEL = 'PRIME VIDEO SYNC';
const GTI_PREFIX = 'amzn1.dv.gti.';

/** A key the review list takes: the gti's uuid, else a hash of the gti */
const entryKey = (gti: string): string => {
  const short = gti.startsWith(GTI_PREFIX)
    ? gti.slice(GTI_PREFIX.length).replaceAll('-', '')
    : gti;
  return v.is(UnresolvedKeySchema, short)
    ? short
    : createHash('sha256').update(gti).digest('base64url');
};

type Played = Readonly<{
  episodeText: string | null;
  /** Not played to the end (by its season page's progress bar): read, never marked */
  unfinished?: true;
  gti: string;
  /** Null for a film */
  season: Readonly<{ season: number; show: string }> | null;
  time: number;
  title: string;
  /** Season from the title's own words (0 when none), so the matcher tries and the rest goes to review */
  unsure?: true;
}>;

/** A season's best guess from its own title, when its detail page can't help */
const guessedSeason = (text: string) => {
  const named = primeSeason(text);
  return { season: named.season ?? 0, show: named.show ?? text };
};

type Flattened = Readonly<{ invalid: number; played: ReadonlyArray<Played> }>;

type SeasonOf = (entry: PrimeEntry) => Promise<
  | Readonly<{
      ok: true;
      /** By episode gti; null when the season page couldn't be read */
      progress: ReadonlyMap<string, number> | null;
      season: Played['season'];
    }>
  | ReadFailure
>;

/** Prime Video's own bar: an episode counts once it's 90% played */
const FINISHED = 0.9;

/** Without its progress an episode can't be known finished: it isn't marked */
const finished = (progress: ReadonlyMap<string, number> | null, gti: string) =>
  (progress?.get(gti) ?? 0) >= FINISHED;

/** A real episode: "Episode <n>: …" past Episode 0 (trailers and extras) */
const isEpisode = (entry: PrimeEntry) => primeEpisode(entry.text) !== null;

/** A child outside the known shape is counted, so a change reads as one rather than as a history of films */
const episodesOf = (
  entry: PrimeEntry,
): Readonly<{ episodes: ReadonlyArray<PrimeEntry>; invalid: number }> => {
  if (entry.titleType === 'episode') {
    return { episodes: isEpisode(entry) ? [entry] : [], invalid: 0 };
  }
  const episodes: PrimeEntry[] = [];
  let invalid = 0;
  for (const raw of entry.children) {
    const child = parseEntry(raw);
    if (!child) {
      invalid += 1;
    } else if (isEpisode(child)) {
      episodes.push(child);
    }
  }
  return { episodes, invalid };
};

/**
 * Amazon's sign-in, or `MAX_FAILED_LOOKUPS` busy or down, fails the page. A
 * page with nothing in the known shape (and nothing merely left out) has
 * changed.
 */
const flatten = async (
  raw: ReadonlyArray<unknown>,
  seasonOf: SeasonOf,
): Promise<Readonly<{ ok: true; flattened: Flattened }> | ReadFailure> => {
  // Entries outside the known shape, and episodes left out for their season
  let outOfShape = 0;
  let failedLookups = 0;
  const played: Played[] = [];
  for (const item of raw) {
    const entry = parseEntry(item);
    if (!entry) {
      outOfShape += 1;
      continue;
    }
    if (entry.titleType === 'movie') {
      played.push({
        episodeText: null,
        gti: entry.gti,
        season: null,
        time: entry.time,
        title: entry.text,
      });
      continue;
    }
    if (entry.titleType !== 'season' && entry.titleType !== 'episode') {
      outOfShape += 1;
      continue;
    }
    const { episodes, invalid: invalidChildren } = episodesOf(entry);
    outOfShape += invalidChildren;
    if (episodes.length === 0) {
      continue;
    }
    const resolved = await seasonOf(entry);
    if (!resolved.ok) {
      if (resolved.reason === 'signed-out') {
        return resolved;
      }
      if (resolved.reason === 'unavailable') {
        failedLookups += 1;
        if (failedLookups >= MAX_FAILED_LOOKUPS) {
          return resolved;
        }
      }
      console.warn(
        `[${LABEL}] ${episodes.length} episodes read from their title alone: their detail page answered ${resolved.reason}`,
      );
    }
    // Never left out: without a sure season, the title's own words go to
    // the matcher, and what it can't place waits in the review list
    const sure = resolved.ok ? resolved.season : null;
    const progress = resolved.ok ? resolved.progress : null;
    const season = sure ?? guessedSeason(entry.text);
    for (const episode of episodes) {
      played.push({
        episodeText: episode.text,
        gti: episode.gti,
        season,
        time: episode.time,
        title: season.show,
        ...(sure ? {} : { unsure: true as const }),
        ...(finished(progress, episode.gti)
          ? {}
          : { unfinished: true as const }),
      });
    }
  }
  if (played.length === 0 && outOfShape > 0) {
    return readFailure('changed');
  }
  played.sort((a, b) => b.time - a.time);
  return {
    flattened: { invalid: outOfShape, played },
    ok: true,
  };
};

/** A page of only trailers and extras has no entries but isn't the end */
const toPage = ({ invalid, played }: Flattened, more: boolean): HistoryPage => {
  const entries: HistoryEntry[] = [];
  for (const play of played) {
    const index = entries.length;
    if (!play.season || play.episodeText === null) {
      entries.push({
        key: entryKey(play.gti),
        row: null,
        watchedAt: play.time,
      });
      continue;
    }
    if (play.unfinished) {
      entries.push({
        key: entryKey(play.gti),
        row: null,
        unfinished: true,
        watchedAt: play.time,
      });
      continue;
    }
    const row = primeRow(play.season, play.episodeText, index, play.time);
    if (row) {
      // An unsure season of 0 is no season at all: the matcher looks by show
      const sure =
        play.unsure && row.season === 0 ? { ...row, season: '' } : row;
      entries.push({
        key: entryKey(play.gti),
        row: sure,
        watchedAt: play.time,
      });
    }
  }
  return more ? { entries, invalid, more } : { entries, invalid };
};

const latestOf = (played: ReadonlyArray<Played>): ConnectionLatest | null => {
  const [newest] = played;
  return newest
    ? {
        episodeTitle: newest.episodeText,
        title: newest.title,
        watchedAt: newest.time,
      }
    : null;
};

type Answered = Readonly<{ ok: true; answer: HistoryAnswer | null }>;

/** Each page and season is fetched once per run */
const createHistory = (jar: CookieJar) => {
  // Pages and season lookups alike, so a walk to a page never goes back to back
  const pace = createPacer();
  /** Page n's cursor; `null` for the first, absent once past the last */
  const cursors = new Map<number, string | null>([[0, null]]);
  let lastRead: Readonly<{ answer: HistoryAnswer; page: number }> | null = null;
  const details = new Map<string, SeasonDetail>();

  /** Walks the cursors from the deepest one known; out of time, stops at the deepest page reached */
  const walkTo = async (
    page: number,
    hasTime: () => boolean,
  ): Promise<
    Answered | Readonly<{ ok: true; walking: PageCursor }> | ReadFailure
  > => {
    let at = Math.max(...[...cursors.keys()].filter((known) => known <= page));
    let reads = 0;
    while (true) {
      let answer = lastRead?.page === at ? lastRead.answer : null;
      if (!answer) {
        const cursor = cursors.get(at);
        if (cursor === undefined) {
          return { answer: null, ok: true };
        }
        if (reads > 0 && cursor !== null && !hasTime()) {
          return { ok: true, walking: { page: at, token: cursor } };
        }
        await pace();
        const read = await readHistoryPage(jar, cursor);
        reads += 1;
        if (!read.ok) {
          return read;
        }
        answer = read.answer;
        lastRead = { answer, page: at };
        if (answer.nextToken) {
          cursors.set(at + 1, answer.nextToken);
        }
      }
      if (at === page) {
        return { answer, ok: true };
      }
      if (!answer.nextToken) {
        return { answer: null, ok: true };
      }
      at += 1;
    }
  };

  /** Walks from the first page when there's no stored cursor or reading it fails in any way */
  const answerOf = async (
    page: number,
    { from, hasTime }: ReadPageOptions,
  ): Promise<
    Answered | Readonly<{ ok: true; walking: PageCursor }> | ReadFailure
  > => {
    if (from === null && page > 0) {
      return { answer: null, ok: true };
    }
    if (!from || from.page > page || cursors.has(from.page)) {
      return walkTo(page, hasTime);
    }
    cursors.set(from.page, from.token);
    const before = lastRead;
    const read = await walkTo(page, hasTime);
    // Only the stored cursor's own failure: a later page's is the page's
    if (read.ok || lastRead !== before) {
      return read;
    }
    // Whatever Prime Video answers a token it no longer takes (a refusal,
    // an error, a sign-in bounce), the first page's answer is the one
    // that stands: forget the cursor and walk from there
    cursors.delete(from.page);
    return walkTo(page, hasTime);
  };

  /**
   * The season page, once a run: it holds each episode's progress, and the
   * season when the title doesn't name it
   */
  const seasonOf: SeasonOf = async (entry) => {
    const named =
      entry.titleType === 'season'
        ? primeSeason(entry.text)
        : { season: null, show: null };
    const fromTitle =
      named.season !== null && named.show !== null
        ? { part: named.part, season: named.season, show: named.show }
        : null;
    const id = detailId(entry.href);
    if (!id) {
      return { ok: true, progress: null, season: fromTitle };
    }
    let detail = details.get(id);
    if (!detail) {
      await pace();
      const read = await readSeasonDetail(jar, id);
      if (!read.ok) {
        return read;
      }
      detail = read.detail;
      details.set(id, detail);
    }
    return {
      ok: true,
      progress: detail.progress,
      season: fromTitle ?? seasonFrom(named, detail),
    };
  };

  const flattenedPage = async (
    page: number,
    options: ReadPageOptions = { hasTime: () => true },
  ): Promise<
    | Readonly<{
        ok: true;
        flattened: Flattened;
        next: PageCursor | null;
        more: boolean;
        profileName: string | null;
      }>
    | Readonly<{ ok: true; walking: PageCursor }>
    | ReadFailure
  > => {
    const read = await answerOf(page, options);
    if (!read.ok || 'walking' in read) {
      return read;
    }
    if (!read.answer) {
      return {
        flattened: { invalid: 0, played: [] },
        more: false,
        next: null,
        ok: true,
        profileName: null,
      };
    }
    const { nextToken, profileName } = read.answer;
    const flat = await flatten(read.answer.entries, seasonOf);
    return flat.ok
      ? {
          ...flat,
          more: true,
          next: nextToken ? { page: page + 1, token: nextToken } : null,
          profileName,
        }
      : flat;
  };

  const activeProfile = async () => {
    await pace();
    return readActiveProfile(jar);
  };

  return { activeProfile, flattenedPage };
};

export const primeReader: ServiceReader = {
  label: LABEL,
  link: async (cookies) => {
    const jar = cookieJar(cookies, SITE);
    const history = createHistory(jar);
    const read = await history.flattenedPage(0);
    if (!read.ok || 'walking' in read) {
      return read.ok ? readFailure('read-failed') : read;
    }
    // Which profile this is: a nicety for the card and the check each sync
    // makes, so a page that won't say doesn't stop the link
    const active = await history.activeProfile();
    const profile = active.ok ? active.profile : null;
    return {
      latest: latestOf(read.flattened.played),
      ok: true,
      profileId: profile?.id ?? NO_PROFILE,
      profileName: profile?.name ?? read.profileName,
      secret: secretFromCookies(jar.cookies()),
      // Prime Video doesn't say how long the history is
      total: null,
    };
  },
  open: async (secret, profileId) => {
    const jar = openJar(secret, SITE);
    if (!jar) {
      return readFailure('read-failed');
    }
    const history = createHistory(jar);
    // The session reads whichever profile it's on: if that's no longer the
    // linked one, stop rather than mix someone else's history in
    if (profileId !== NO_PROFILE) {
      const active = await history.activeProfile();
      if (!active.ok) {
        return active;
      }
      if (active.profile && active.profile.id !== profileId) {
        return readFailure('profile-changed');
      }
    }
    return {
      ok: true,
      session: {
        readPage: async (page, options) => {
          const read = await history.flattenedPage(page, options);
          return read.ok && 'flattened' in read
            ? {
                next: read.next,
                ok: true,
                page: toPage(read.flattened, read.more),
              }
            : read;
        },
        // Amazon renews its cookies on every read and refuses the old ones later
        get secret() {
          return jarSecret(jar, secret);
        },
      },
    };
  },
  watchProvider: PRIME_VIDEO_WATCH_PROVIDER,
};
