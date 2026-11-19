import {
  type LibraryItem,
  type LibraryOn,
  type LibraryShelf,
  parseEpisodeCode,
  seasonCode,
} from '@tvseri.es/schemas';
import {
  doneCount,
  formatRuntime,
  initialOf,
  type LibraryLetter,
} from '@tvseri.es/utils';

import { formatMonthYear } from '@/lib/format/date';
import { finishedLabel } from '@/lib/format/finished';
import { statusFact } from '@/lib/format/status';

/** Which glyph a tile fact wears; `plain` has none */
export type TileFactKind =
  | 'ended'
  | 'favourite'
  | 'finished'
  | 'hidden'
  | 'ongoing'
  | 'plain'
  | 'runtime'
  /** "Seen, no date": finished with every episode "I don't remember" */
  | 'seen'
  | 'watching'
  | 'watchlist';

export type TileFact = Readonly<{ kind: TileFactKind; text: string }>;

/**
 * One Library tile as the client draws it, trimmed on the server (about
 * 250 bytes): the poster, one meta line per shelf, the Watching progress
 * line, and what the Remote and Select need.
 */
export type TileView = Readonly<{
  id: number;
  title: string;
  slug: string;
  posterImage: string;
  /** The shelf's own date (Undo re-adds with it) */
  addedAt: number;
  /** Watching: the next episode's code badge ("S02E06") */
  code: string | null;
  meta: ReadonlyArray<TileFact>;
  /** Watching: the 4px line on the poster, in percent of every regular episode */
  line: Readonly<{ aired: number; watched: number }> | null;
  /** The owner's favourite, on every shelf but Favourites: the heart on the poster */
  heart: boolean;
  on: LibraryOn;
  /** At least one episode aired (the Remote's N) */
  hasAired: boolean;
  /** The season E opens the history sheet on */
  historySeason: number;
  /** The A–Z rail's letter of the title (The/A/An ignored) */
  initial: LibraryLetter;
  /** Finished with no dates at all (Get started's "Seen it") */
  undated: boolean;
}>;

const seasonOf = (code: string | null): number | null =>
  (code ? parseEpisodeCode(code)?.seasonNumber : null) ?? null;

const present = (facts: ReadonlyArray<TileFact | null>) =>
  facts.filter((fact): fact is TileFact => fact !== null);

/** Watchlist: "9h · Ongoing", "6h · Miniseries" */
function sizeFacts(item: LibraryItem): ReadonlyArray<TileFact> {
  const { facts } = item;
  if (!facts) {
    return [];
  }
  const hours = formatRuntime(facts.totalRuntime);
  const status =
    facts.type === 'Miniseries'
      ? ({ kind: 'ended', text: 'Miniseries' } as const)
      : statusFact(facts);
  return present([hours ? { kind: 'runtime', text: hours } : null, status]);
}

/** Watching: "5 to go", "1 new · airing", "Up to date" */
function toGo(item: LibraryItem): string {
  const { progress } = item;
  if (!progress || progress.toWatch === 0) {
    return 'Up to date';
  }
  return progress.airing
    ? `${progress.toWatch} new · airing`
    : `${progress.toWatch} to go`;
}

/** "Hidden Mar 2026" this year, "Hidden 2025" before */
function hiddenLabel(hiddenAt: number, now: number): string {
  const year = new Date(hiddenAt).getUTCFullYear();
  return year === new Date(now).getUTCFullYear()
    ? `Hidden ${formatMonthYear(hiddenAt)}`
    : `Hidden ${year}`;
}

/** "Finished Mar 15", or "Seen, no date" for a show marked without dates */
function finishedFact(
  item: LibraryItem,
  finishedAt: number,
  now: number,
): TileFact {
  return item.undated
    ? { kind: 'seen', text: 'Seen, no date' }
    : { kind: 'finished', text: finishedLabel(finishedAt, now) };
}

/** The owner's own state of a favourite: "Finished Mar 15", "Watching S02" */
function stateFact(item: LibraryItem, now: number): TileFact | null {
  if (item.finishedAt !== null) {
    return finishedFact(item, item.finishedAt, now);
  }
  if (item.on.watching && item.progress?.lastSeason) {
    return {
      kind: 'watching',
      text: `Watching ${seasonCode(item.progress.lastSeason)}`,
    };
  }
  return null;
}

/** All shows: one state per show, the strongest first */
function allFact(on: LibraryOn): TileFact {
  if (on.watching) {
    return { kind: 'watching', text: 'Watching' };
  }
  if (on.hidden) {
    return { kind: 'hidden', text: 'Hidden' };
  }
  if (on.finished) {
    return { kind: 'finished', text: 'Finished' };
  }
  if (on.watchlist) {
    return { kind: 'watchlist', text: 'Watchlist' };
  }
  return { kind: 'favourite', text: 'Favourite' };
}

function metaOf(
  item: LibraryItem,
  shelf: LibraryShelf,
  now: number,
): ReadonlyArray<TileFact> {
  switch (shelf) {
    case 'watching':
      return [{ kind: 'plain', text: toGo(item) }];
    case 'watchlist':
      return sizeFacts(item);
    case 'finished':
      return item.finishedAt === null
        ? []
        : [finishedFact(item, item.finishedAt, now)];
    case 'favourites': {
      const state = stateFact(item, now);
      return state ? [state] : sizeFacts(item).slice(0, 1);
    }
    case 'hidden': {
      const last = item.progress?.lastWatched;
      if (last) {
        return [{ kind: 'hidden', text: `Stopped at ${last}` }];
      }
      return item.hiddenAt === null
        ? []
        : [{ kind: 'hidden', text: hiddenLabel(item.hiddenAt, now) }];
    }
    case 'all':
      return [allFact(item.on)];
  }
}

/** Favourites wears no heart: every tile on it is one */
export const shelfShowsHearts = (shelf: LibraryShelf) => shelf !== 'favourites';

/** A progress line's percent of every regular episode, to one decimal */
export const progressPercent = (part: number, whole: number) =>
  Math.round((Math.min(part, whole) / whole) * 1000) / 10;

/**
 * Every per-shelf rule of a tile: the meta line, the code badge and
 * progress line on Watching, the heart on a favourite, and the season the
 * Remote's E opens. Pure: `now` decides "this year" (UTC, like the rest of
 * the profile).
 */
export function toTileView(
  item: LibraryItem,
  shelf: LibraryShelf,
  now: number,
): TileView {
  const { progress } = item;
  const watching = shelf === 'watching';
  const nextCode = progress?.next ?? null;
  return {
    addedAt: item.addedAt,
    code: watching ? nextCode : null,
    hasAired: item.facts?.hasAired ?? true,
    heart: shelfShowsHearts(shelf) && item.on.favourite,
    historySeason:
      seasonOf(nextCode) ??
      progress?.lastSeason ??
      seasonOf(progress?.lastWatched ?? null) ??
      1,
    id: item.id,
    initial: initialOf(item.title),
    line:
      watching && progress && progress.total > 0
        ? {
            aired: progressPercent(progress.aired, progress.total),
            // Done: watched or skipped (`toWatch` leaves both out)
            watched: progressPercent(
              doneCount(progress.aired, progress.toWatch),
              progress.total,
            ),
          }
        : null,
    meta: metaOf(item, shelf, now),
    on: item.on,
    posterImage: item.posterImage,
    slug: item.slug,
    title: item.title,
    undated: item.undated === true,
  };
}
