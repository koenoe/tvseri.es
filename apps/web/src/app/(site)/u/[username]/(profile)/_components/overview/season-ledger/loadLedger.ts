import 'server-only';

import type { Ledger, LedgerDetail, LedgerShow } from '@tvseri.es/schemas';

import { apiFetch } from '@/lib/api/client';
import { loadSeriesOrNull } from '@/lib/series/loaders';

import { type Profile, withToken } from '../../../_data/profile';
import { orNull } from '../../../_lib/orNull';
import { airedLabel } from './ledgerLines';

/** How many shows with holes the lane can step through ("Next: <show>") */
const SHOWS = 4;
/** Used when TMDB's season has no episode count: enough steps to place the gap */
const MIN_STEPS = 8;

export type LedgerEpisodeView = Readonly<{
  aired: string;
  code: string;
  episode: number;
  season: number;
  title: string;
}>;

/** One show with holes, ready for the lane: what the chart and the rows draw */
export type LedgerView = Readonly<{
  episodes: ReadonlyArray<LedgerEpisodeView>;
  posterImage: string;
  seasonCount: number;
  seriesId: number;
  slug: string;
  title: string;
  /** Steps per season that has a hole (the gap's place in its line) */
  totals: Readonly<Record<number, number>>;
  /** Seasons that haven't aired yet: a soft track, nothing missing */
  unaired: ReadonlyArray<number>;
}>;

async function toView(
  profile: Profile,
  show: LedgerShow,
): Promise<LedgerView | null> {
  // One show's reads may fail without failing the lane: the other shows still
  // draw, and a missing series only loses the season lengths (a guess is used).
  const [detail, series] = await Promise.all([
    orNull(
      apiFetch<LedgerDetail>('/me/ledger/:id', {
        notFound: 'null',
        ...withToken(profile),
        params: { id: show.seriesId },
      }),
    ),
    loadSeriesOrNull(show.seriesId),
  ]);
  if (!detail || detail.episodes.length === 0) {
    return null;
  }
  const seasons = series?.seasons ?? [];
  const totals: Record<number, number> = {};
  for (const { season } of show.seasons) {
    const known = seasons.find((entry) => entry.seasonNumber === season);
    const last = Math.max(
      ...detail.episodes
        .filter((episode) => episode.season === season)
        .map((episode) => episode.episode),
    );
    totals[season] = known?.numberOfEpisodes ?? Math.max(MIN_STEPS, last + 1);
  }
  return {
    episodes: detail.episodes.map((episode) => ({
      aired: airedLabel(episode.airDate),
      code: episode.code,
      episode: episode.episode,
      season: episode.season,
      title: episode.title,
    })),
    posterImage: show.posterImage,
    seasonCount: show.seasonCount,
    seriesId: show.seriesId,
    slug: show.slug,
    title: show.title,
    totals,
    unaired: seasons
      .filter((entry) => !entry.hasAired && entry.seasonNumber > 0)
      .map((entry) => entry.seasonNumber),
  };
}

export async function loadLedger(
  profile: Profile,
): Promise<ReadonlyArray<LedgerView>> {
  const ledger = await apiFetch<Ledger>('/me/ledger', withToken(profile));
  const views = await Promise.all(
    ledger.shows.slice(0, SHOWS).map((show) => toView(profile, show)),
  );
  return views.filter((view): view is LedgerView => view !== null);
}
