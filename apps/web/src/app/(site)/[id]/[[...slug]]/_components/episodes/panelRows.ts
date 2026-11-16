import type { EpisodeRef } from '@tvseri.es/schemas';
import { plural } from '@/lib/format/text';
import { shortCode } from '@/lib/marking/copy';

import { codeOf } from '@/lib/marking/progress';
import type { SeriesBase } from '@/lib/marking/types';

import { toNumberParam } from '../../_lib/numberParam';
import type { ShowEpisode } from '../../_lib/seasonEpisodes';
import type { ShowSeason, ShowSummary } from '../../_lib/show';
import { airWeekday, airYear } from './format';
import { fallbackRuntime, weightOf } from './marks';

/**
 * The season panel's rows: name, state on the right, "2024 · 10 episodes", and the season's own 4px
 * line (runs merge above 12 episodes; widths by runtime once the season's
 * episodes are in, equal until then). Pure, from the live marking view.
 */

/** Above this many regular seasons the panel gets "Go to season". */
export const PANEL_QUERY_ABOVE = 12;
/** Above this many episodes a row's line merges runs of one state. */
const PANEL_MERGE_ABOVE = 12;
/** Type-ahead keystrokes within this window build one number ("2", "7" → 27). */
export const TYPE_AHEAD_MS = 900;

export type PanelSegment = Readonly<{
  kind: 'w' | 'nd' | 'nx' | 'na' | '';
  flex: number;
}>;

export type PanelRow = Readonly<{
  seasonNumber: number;
  name: string;
  sub: string;
  state: Readonly<{ text: string; tone: 'default' | 'done' | 'pink' }>;
  aria: string;
  segments: ReadonlyArray<PanelSegment>;
}>;

export const seasonName = (seasonNumber: number) =>
  seasonNumber === 0 ? 'Specials' : `Season ${seasonNumber}`;

/** A season's option id in the select's listbox. */
export const optionId = (listboxId: string, seasonNumber: number) =>
  `${listboxId}-s${seasonNumber}`;

type EpisodeRuntime = Pick<ShowEpisode, 'episodeNumber' | 'runtime'>;

/** Loaded seasons' episode runtimes, by season number (they weight the line). */
export type EpisodesBySeason = ReadonlyMap<
  number,
  ReadonlyArray<EpisodeRuntime>
>;

/** `GET /api/series/:id/runtimes` (index = episode number − 1) as rows read it. */
export function runtimesBySeason(
  runtimes: Readonly<Record<number, ReadonlyArray<number>>>,
): EpisodesBySeason {
  return new Map(
    Object.entries(runtimes).map(([season, minutes]) => [
      Number(season),
      minutes.map((runtime, index) => ({ episodeNumber: index + 1, runtime })),
    ]),
  );
}

/** Each episode's width: its runtime once the season is loaded, else equal. */
function weightsOf(
  count: number,
  episodes: ReadonlyArray<EpisodeRuntime> | undefined,
): (index: number) => number {
  if (!episodes?.length) {
    return () => 1;
  }
  const fallback = fallbackRuntime(episodes) || 1;
  const byNumber = new Map(
    episodes.map((episode) => [episode.episodeNumber, episode]),
  );
  return (index) => {
    const episode = byNumber.get(index + 1);
    return index < count && episode ? weightOf(episode, fallback) : fallback;
  };
}

function segmentsOf(
  season: ShowSeason,
  view: SeriesBase,
  nextUp: EpisodeRef | null,
  episodes: ReadonlyArray<EpisodeRuntime> | undefined,
): ReadonlyArray<PanelSegment> {
  const count = Math.max(season.episodeCount, season.airedEpisodeCount);
  if (season.airedEpisodeCount === 0 || count === 0) {
    return [{ flex: 1, kind: 'na' }];
  }
  const weight = weightsOf(count, episodes);
  const raw: PanelSegment[] = Array.from({ length: count }, (_, index) => {
    const ref = { episodeNumber: index + 1, seasonNumber: season.seasonNumber };
    const record = view.watched[codeOf(ref)];
    const kind: PanelSegment['kind'] = record
      ? record.dateUnknown
        ? 'nd'
        : 'w'
      : nextUp?.seasonNumber === ref.seasonNumber &&
          nextUp.episodeNumber === ref.episodeNumber
        ? 'nx'
        : index >= season.airedEpisodeCount
          ? 'na'
          : '';
    return { flex: weight(index), kind };
  });
  if (count <= PANEL_MERGE_ABOVE) {
    return raw;
  }
  const merged: { kind: PanelSegment['kind']; flex: number }[] = [];
  for (const segment of raw) {
    const last = merged[merged.length - 1];
    if (last && last.kind === segment.kind) {
      last.flex += segment.flex;
    } else {
      merged.push({ ...segment });
    }
  }
  return merged;
}

function stateOf(
  season: ShowSeason,
  view: SeriesBase,
  nextToAir: ShowSummary['nextEpisodeToAir'],
): Pick<PanelRow, 'aria' | 'state'> {
  const name = seasonName(season.seasonNumber);
  const count = Math.max(season.episodeCount, season.airedEpisodeCount);
  const aired = season.airedEpisodeCount;
  let watched = 0;
  for (let episode = 1; episode <= count; episode += 1) {
    if (
      view.watched[
        codeOf({ episodeNumber: episode, seasonNumber: season.seasonNumber })
      ]
    ) {
      watched += 1;
    }
  }
  const year = airYear(season.airDate);
  if (aired === 0 && count > 0 && year) {
    return {
      aria: `${name}, coming ${year}`,
      state: { text: year, tone: 'pink' },
    };
  }
  if (aired > 0 && aired < count) {
    const next =
      nextToAir?.seasonNumber === season.seasonNumber ? nextToAir : null;
    const number = next?.episodeNumber ?? aired + 1;
    const day = next ? airWeekday(next.airDate) : '';
    return {
      aria: `${name}, airing, ${watched} of ${aired} aired watched, next episode ${number}${day ? ` on ${day}` : ''}`,
      state: {
        text: `${shortCode(number)}${day ? ` ${day}` : ''}`,
        tone: 'pink',
      },
    };
  }
  if (count > 0 && watched >= count) {
    return {
      aria: `${name}, all ${count} watched`,
      state: { text: 'Watched', tone: 'done' },
    };
  }
  if (watched > 0) {
    return {
      aria: `${name}, ${watched} of ${count} watched`,
      state: { text: `${watched} of ${count}`, tone: 'default' },
    };
  }
  return {
    aria: `${name}, ${plural(count, 'episode')}, not started`,
    state: { text: 'Not started', tone: 'default' },
  };
}

/**
 * A row for someone signed out: the season's own facts only. The
 * personal states ("Not started", "4 of 10", Watched) go; the pink airing
 * day and announced year stay (they say nothing about the viewer).
 */
function neutralState(
  row: Pick<PanelRow, 'aria' | 'state'>,
  season: ShowSeason,
  count: number,
): Pick<PanelRow, 'aria' | 'state'> {
  return row.state.tone === 'pink'
    ? row
    : {
        aria: `${seasonName(season.seasonNumber)}, ${plural(count, 'episode')}`,
        state: { text: '', tone: 'default' },
      };
}

/**
 * Every season's row, in the summary's order (Specials last). `personal`
 * false (signed out, or the viewer's marks didn't load): no personal state
 * and no Next-up segment.
 */
export function panelRows(
  show: Pick<ShowSummary, 'nextEpisodeToAir' | 'seasons'>,
  view: SeriesBase,
  nextUp: EpisodeRef | null,
  episodes: EpisodesBySeason = new Map(),
  personal = true,
): ReadonlyArray<PanelRow> {
  return show.seasons.map((season) => {
    const count = Math.max(season.episodeCount, season.airedEpisodeCount);
    const year = airYear(season.airDate);
    const sub =
      season.airedEpisodeCount === 0 && season.seasonNumber !== 0
        ? 'Announced'
        : season.seasonNumber === 0 || !year
          ? plural(count, 'episode')
          : `${year} · ${plural(count, 'episode')}`;
    const state = stateOf(season, view, show.nextEpisodeToAir);
    return {
      ...(personal ? state : neutralState(state, season, count)),
      name: seasonName(season.seasonNumber),
      seasonNumber: season.seasonNumber,
      segments: segmentsOf(
        season,
        view,
        personal ? nextUp : null,
        episodes.get(season.seasonNumber),
      ),
      sub,
    };
  });
}

/** "Go to season": "27" → seasons starting with 27; "s"/"sp" → Specials. */
export function filterRows<T extends Pick<PanelRow, 'seasonNumber'>>(
  rows: ReadonlyArray<T>,
  query: string,
): ReadonlyArray<T> {
  const text = query.trim().toLowerCase();
  if (!text) {
    return rows;
  }
  if (/^s/.test(text) && !/^season/.test(text)) {
    return rows.filter((row) => row.seasonNumber === 0);
  }
  const digits = text.replace(/[^0-9]/g, '');
  return digits
    ? rows.filter(
        (row) =>
          row.seasonNumber > 0 && String(row.seasonNumber).startsWith(digits),
      )
    : rows;
}

/**
 * Type-ahead on the open panel: digits build a season number within
 * `TYPE_AHEAD_MS` ("2" then "7" → Season 27), "s"/"p" jump to Specials.
 * Returns the row to highlight (-1: none) and the buffer to keep.
 */
export function typeAhead(
  rows: ReadonlyArray<Pick<PanelRow, 'seasonNumber'>>,
  buffer: string,
  key: string,
): Readonly<{ index: number; buffer: string }> {
  const char = key.toLowerCase();
  if (char === 's' || char === 'p') {
    return {
      buffer: '',
      index: rows.findIndex((row) => row.seasonNumber === 0),
    };
  }
  const find = (text: string, exact: boolean) =>
    rows.findIndex(
      (row) =>
        row.seasonNumber > 0 &&
        (exact
          ? String(row.seasonNumber) === text
          : String(row.seasonNumber).startsWith(text)),
    );
  let next = `${buffer}${char}`;
  let index = find(next, true);
  if (index < 0) {
    index = find(next, false);
  }
  if (index < 0) {
    next = char;
    index = find(char, false);
  }
  return { buffer: next, index };
}

/** The season the page opens on: Next up's, else the first (Specials last). */
export function defaultSeasonNumber(
  seasons: ReadonlyArray<Pick<ShowSeason, 'seasonNumber'>>,
  nextUp: EpisodeRef | null,
): number | null {
  if (
    nextUp &&
    seasons.some((season) => season.seasonNumber === nextUp.seasonNumber)
  ) {
    return nextUp.seasonNumber;
  }
  return seasons[0]?.seasonNumber ?? null;
}

/**
 * The season `?season=N` asks the section for: one the show has, and never
 * while the history sheet is open (`?history&season=N` is the sheet's).
 * The server's wall and the browser's (`SeasonParam`) read it alike, so a
 * season link paints its season first and hydration never switches it.
 */
export function seasonFromQuery(
  seasons: ReadonlyArray<Pick<ShowSeason, 'seasonNumber'>>,
  query: Readonly<{ history: boolean; season: string | null }>,
): number | null {
  const value = query.history ? null : toNumberParam(query.season);
  return value !== null &&
    seasons.some((season) => season.seasonNumber === value)
    ? value
    : null;
}
