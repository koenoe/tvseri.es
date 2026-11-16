import type { TvSeries } from '@tvseri.es/schemas';

/**
 * A show as the discover pages draw it (poster tiles, rows, lists). Trimmed
 * inside the cached loaders, so the RSC payload and the cache entries carry
 * only these fields.
 */
export type TileShow = Readonly<{
  id: number;
  slug: string;
  title: string;
  /** The title as it was written (language landing's title wall) */
  originalTitle: string;
  poster: string | null;
  backdrop: string | null;
  /** First air year, null when unknown */
  year: number | null;
  genreIds: ReadonlyArray<number>;
  /** The network TMDB lists first (the hub's in-place rows), null when none */
  network: string | null;
  voteAverage: number;
  voteCount: number;
}>;

export function toTileShow(series: TvSeries): TileShow {
  const year = Number.parseInt(series.firstAirDate.slice(0, 4), 10);
  return {
    backdrop: series.backdropImage || null,
    genreIds: series.genres.map((genre) => genre.id),
    id: series.id,
    network: series.network?.name ?? null,
    originalTitle: series.originalTitle,
    poster: series.posterImage || null,
    slug: series.slug,
    title: series.title,
    voteAverage: series.voteAverage,
    voteCount: series.voteCount,
    year: Number.isNaN(year) ? null : year,
  };
}
