import type {
  CrewCredit,
  Keyword,
  Person,
  SeriesImages,
  TvSeries,
} from '@tvseri.es/schemas';
import {
  buildBackdropImageUrl,
  buildTitleTreatmentImageUrl,
} from '@tvseri.es/utils';
import type { TmdbAggregateCredits } from '@/lib/person/collaborators';
import { hasFilePath, tmdbFetch } from '@/lib/tmdb/client';
import {
  normalizeAggregateCrew,
  normalizePersons,
  normalizeTvSeries,
  pickAutomaticImages,
} from '@/lib/tmdb/helpers';

/**
 * A show's details as TMDB answers them, undefined when TMDB doesn't know it.
 * The external ids (IMDb), and the cast when asked, ride along in the same
 * request; the images, when asked, are a second one.
 */
export const fetchRawTvSeries = async (
  id: number,
  { credits = false, images: withImages = false } = {},
) => {
  const series = await tmdbFetch(`/3/tv/${id}`, {
    append: credits ? ['external_ids', 'credits'] : ['external_ids'],
  });

  if (!series || !withImages) {
    return series;
  }

  const images = await tmdbFetch(`/3/tv/${series.id}/images`, {
    query: {
      include_image_language: `en,null,${series.original_language ?? ''}`,
    },
  });

  return images ? { ...series, images } : series;
};

/**
 * The show, its keywords and its recommendations in one TMDB call
 * (append_to_response), for the home picks.
 */
export async function fetchTvSeriesForPicks(id: number) {
  const response = await tmdbFetch(`/3/tv/${id}`, {
    append: ['keywords', 'recommendations'],
  });

  if (!response) {
    return undefined;
  }

  return {
    keywords: (response.keywords?.results ?? []).map(
      (keyword): Keyword => ({
        id: keyword.id,
        name: String(keyword.name),
      }),
    ),
    recommendations: (response.recommendations?.results ?? [])
      .filter((item) => !!item.poster_path)
      .map((item) => normalizeTvSeries(item)),
    series: normalizeTvSeries(response),
  };
}

/**
 * A show's images on TMDB: text-free backdrops and every logo in TMDB's vote
 * order (logos with size and language), and the images the series object
 * uses when no admin pick is saved (`automatic`).
 */
export async function fetchTvSeriesImages(
  id: number,
  originalLanguage?: string,
): Promise<Omit<SeriesImages, 'preferred'> | undefined> {
  const response = await tmdbFetch(`/3/tv/${id}/images`, {
    query: {
      include_image_language: `en,null,${originalLanguage ?? ''}`,
    },
  });

  if (!response) {
    return undefined;
  }

  const byVotes = (
    a: Readonly<{ vote_average?: number }>,
    b: Readonly<{ vote_average?: number }>,
  ) => (b.vote_average ?? 0) - (a.vote_average ?? 0);

  return {
    automatic: pickAutomaticImages(response),
    backdrops: (response.backdrops ?? [])
      .filter(hasFilePath)
      .filter((backdrop) => backdrop.iso_639_1 === null)
      .sort(byVotes)
      .map((backdrop) => ({
        path: backdrop.file_path,
        url: buildBackdropImageUrl(backdrop.file_path),
      })),
    titleTreatment: (response.logos ?? [])
      .filter(hasFilePath)
      .sort(byVotes)
      .map((logo) => ({
        height: logo.height ?? 0,
        language: typeof logo.iso_639_1 === 'string' ? logo.iso_639_1 : null,
        path: logo.file_path,
        url: buildTitleTreatmentImageUrl(logo.file_path),
        width: logo.width ?? 0,
      })),
  };
}

export async function fetchTvSeriesContentRating(
  id: number,
  region = 'US',
): Promise<string | undefined | null> {
  const contentRatings = await tmdbFetch(`/3/tv/${id}/content_ratings`);

  const contentRating =
    contentRatings?.results?.find((rating) => rating.iso_3166_1 === region)
      ?.rating ?? null;

  return contentRating;
}

export async function fetchTvSeriesCredits(
  id: number,
): Promise<Readonly<{ cast: Person[]; crew: CrewCredit[] }>> {
  const credits = await tmdbFetch(`/3/tv/${id}/aggregate_credits`);

  if (!credits?.cast) {
    return {
      cast: [],
      crew: [],
    };
  }

  const cast =
    credits.cast
      .filter((item) => !!item.profile_path)
      .sort((a, b) => a.order - b.order) ?? [];

  return {
    cast: normalizePersons(cast),
    crew: normalizeAggregateCrew(credits.crew),
  };
}

/** `/tv/:id/aggregate_credits`: everyone who worked on a show, with counts */
export async function fetchTvSeriesAggregateCredits(
  id: number,
): Promise<TmdbAggregateCredits | undefined> {
  return tmdbFetch(`/3/tv/${id}/aggregate_credits`);
}

export async function fetchTvSeriesRecommendations(
  id: number,
): Promise<TvSeries[]> {
  const response = await tmdbFetch(`/3/tv/${id}/recommendations`);

  return (response?.results ?? [])
    .filter((series) => !!series.poster_path)
    .map((series) => normalizeTvSeries(series));
}

/**
 * What's needed to pick a Latin-script title: the original name, the origin
 * countries and the alternative titles, in one request.
 */
export async function fetchTvSeriesTitles(id: number) {
  const response = await tmdbFetch(`/3/tv/${id}`, {
    append: ['alternative_titles'],
  });

  return response
    ? {
        alternativeTitles: response.alternative_titles?.results ?? [],
        originalName: response.original_name ?? '',
        originCountry: response.origin_country ?? [],
      }
    : undefined;
}

export async function fetchTvSeriesKeywords(
  id: number,
): Promise<Keyword[] | undefined> {
  const response = await tmdbFetch(`/3/tv/${id}/keywords`);

  return response?.results?.map((keyword) => ({
    id: keyword.id,
    name: String(keyword.name),
  }));
}
