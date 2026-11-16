import type { TvSeries } from '@tvseri.es/schemas';

import { seasonsWithSpecials } from '@/lib/series/seasons';

/**
 * What the show page's client islands share about the show (the episodes
 * section, the history sheet, the episode modal, the admin tray): small, so
 * it costs little in the RSC payload. Built on the server by `toShowSummary`.
 */
export type ShowSeason = Readonly<{
  seasonNumber: number;
  /** "Season 3", "Specials" (TMDB's name). */
  title: string;
  /** `YYYY-MM-DD` or ''. */
  airDate: string;
  episodeCount: number;
  airedEpisodeCount: number;
}>;

export type ShowSummary = Readonly<{
  /** The show's backdrop, '' without one: a missing still falls back to it. */
  backdrop: string;
  id: number;
  slug: string;
  title: string;
  /** The title treatment (logo) image, '' when the show has none. */
  logo: string;
  /** Specials (season 0) last, as the season select draws them. */
  seasons: ReadonlyArray<ShowSeason>;
  status: TvSeries['status'];
  nextEpisodeToAir: Readonly<{
    seasonNumber: number;
    episodeNumber: number;
    airDate: string;
  }> | null;
}>;

const specialsLast = (a: ShowSeason, b: ShowSeason) =>
  (a.seasonNumber === 0 ? 1 : 0) - (b.seasonNumber === 0 ? 1 : 0) ||
  a.seasonNumber - b.seasonNumber;

export function toShowSummary(series: TvSeries): ShowSummary {
  const next = series.nextEpisodeToAir;
  return {
    backdrop: series.backdropImage ?? '',
    id: series.id,
    logo: series.titleTreatmentImage ?? '',
    nextEpisodeToAir: next
      ? {
          airDate: next.airDate,
          episodeNumber: next.episodeNumber,
          seasonNumber: next.seasonNumber,
        }
      : null,
    seasons: seasonsWithSpecials(series)
      .map((season) => ({
        airDate: season.airDate ?? '',
        airedEpisodeCount: season.numberOfAiredEpisodes ?? 0,
        episodeCount: season.numberOfEpisodes ?? season.episodes.length,
        seasonNumber: season.seasonNumber,
        title: season.title,
      }))
      .sort(specialsLast),
    slug: series.slug,
    status: series.status,
    title: series.title,
  };
}
