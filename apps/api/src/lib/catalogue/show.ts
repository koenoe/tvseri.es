import type {
  PreferredImages,
  TmdbTvSeriesImages,
  TvSeries,
} from '@tvseri.es/schemas';
import {
  buildBackdropImageUrl,
  buildTitleTreatmentImageUrl,
} from '@tvseri.es/utils';
import { findPreferredImages } from '@/lib/db/preferredImages';
import detectDominantColorFromImage, {
  detectDominantColorsFromImages,
} from '@/lib/detectDominantColorFromImage';
import { detectLogoSilhouette } from '@/lib/detectLogoSilhouette';
import { readPreferredImages } from '@/lib/preferredBackdrops';
import {
  logoAspectRatio,
  normalizeTvSeries,
  topCastNames,
} from '@/lib/tmdb/helpers';
import { fetchRawTvSeries } from '@/lib/tmdb/series';
import { TMDB_CONCURRENCY } from '@/lib/upstream/budget';
import { mapSettled } from '@/utils/limit';
import { logWarn } from '@/utils/logWarn';

/**
 * Applies the preferred backdrop (and title treatment) when the series has
 * one; otherwise the backdrop's dominant colour, when it was detected.
 * `images`: the show's TMDB images, where a picked logo's aspect ratio is.
 */
const withPreferredImages = (
  tvSeries: TvSeries,
  preferredImages: PreferredImages | null | undefined,
  backdropColor: string | undefined,
  images: TmdbTvSeriesImages | undefined,
): TvSeries => {
  if (preferredImages?.backdropImagePath) {
    const { titleTreatmentImagePath } = preferredImages;
    return {
      ...tvSeries,
      backdropColor: preferredImages.backdropColor,
      backdropImage: buildBackdropImageUrl(preferredImages.backdropImagePath),
      ...(titleTreatmentImagePath && {
        titleTreatmentAspectRatio: logoAspectRatio(
          images,
          titleTreatmentImagePath,
        ),
        titleTreatmentImage: buildTitleTreatmentImageUrl(
          titleTreatmentImagePath,
        ),
      }),
      // The text title: the show's name in the display type, no logo
      ...(preferredImages.titleTreatment === 'text' && {
        titleTreatmentAspectRatio: undefined,
        titleTreatmentImage: undefined,
      }),
    };
  }

  if (tvSeries.backdropPath) {
    return {
      ...tvSeries,
      backdropColor: backdropColor ?? tvSeries.backdropColor,
    };
  }

  return tvSeries;
};

/** The network's logo check (see `detectLogoSilhouette`), when it has an answer */
const withLogoSilhouette = (
  tvSeries: TvSeries,
  logoSilhouette: boolean | undefined,
): TvSeries =>
  tvSeries.network && logoSilhouette !== undefined
    ? { ...tvSeries, network: { ...tvSeries.network, logoSilhouette } }
    : tvSeries;

/** The backdrop whose dominant colour is detected: one without an admin's pick */
const backdropToDetect = (
  tvSeries: TvSeries,
  preferredImages: PreferredImages | null | undefined,
) =>
  preferredImages?.backdropImagePath
    ? undefined
    : tvSeries.backdropPath || undefined;

type ShowOptions = Readonly<{
  /**
   * TMDB's text-free backdrop and logo (one more TMDB call), with the admin's
   * picks over them: for what draws the show's artwork
   */
  artwork?: boolean;
  /**
   * The backdrop's dominant colour and, for one show, whether its network's
   * logo reads as a white silhouette (image checks, stored per image), with
   * the admin's picks: for pages drawn in the show's colour
   */
  colour?: boolean;
}>;

/**
 * A show from TMDB, undefined when TMDB doesn't know it. Without options only
 * TMDB's details (one call): for where artwork and colour aren't drawn
 * (stats, mutations, posters), which saves the DynamoDB reads and the image
 * Lambda.
 */
export async function getShow(
  id: number,
  { artwork = false, colour = false }: ShowOptions = {},
): Promise<TvSeries | undefined> {
  if (!artwork && !colour) {
    const series = await fetchRawTvSeries(id);
    return series ? normalizeTvSeries(series) : undefined;
  }

  const [series, preferredImages] = await Promise.all([
    fetchRawTvSeries(id, { images: artwork }),
    findPreferredImages(id),
  ]);
  if (!series) {
    return undefined;
  }

  const tvSeries = normalizeTvSeries(series);
  const backdropPath = colour
    ? backdropToDetect(tvSeries, preferredImages)
    : undefined;
  const networkLogoPath = colour ? series.networks?.[0]?.logo_path : undefined;
  const [backdropColor, logoSilhouette] = await Promise.all([
    backdropPath
      ? detectDominantColorFromImage({ path: backdropPath, size: 'w780' })
      : undefined,
    networkLogoPath ? detectLogoSilhouette(networkLogoPath) : undefined,
  ]);

  return withPreferredImages(
    withLogoSilhouette(tvSeries, logoSilhouette),
    preferredImages,
    backdropColor,
    series.images,
  );
}

type ShowListOptions = ShowOptions &
  Readonly<{
    /** The top three cast (`topCast`, in the same TMDB call): the hook line */
    cast?: boolean;
  }>;

/**
 * `getShow` for a list, in its order, with bounded concurrency. Shows TMDB
 * doesn't know are dropped; more than 10% failures throw (see mapSettled).
 * The admin's picks and the colours are read in one batch each; the colours
 * are best-effort (without them a show keeps its default colour), and no
 * network logo is checked.
 */
export async function getShows(
  ids: ReadonlyArray<number>,
  { artwork = false, cast = false, colour = false }: ShowListOptions = {},
): Promise<TvSeries[]> {
  const picks = artwork || colour;
  const [fetched, preferredImagesById] = await Promise.all([
    mapSettled(
      ids,
      async (id) => {
        const series = await fetchRawTvSeries(id, {
          credits: cast,
          images: artwork,
        });
        return (
          series && {
            images: series.images,
            series: {
              ...normalizeTvSeries(series),
              ...(cast && { topCast: topCastNames(series.credits) }),
            } satisfies TvSeries,
          }
        );
      },
      TMDB_CONCURRENCY,
    ),
    picks
      ? readPreferredImages(ids)
      : new Map<number, PreferredImages | null | undefined>(),
  ]);

  if (!picks) {
    return fetched.map(({ series }) => series);
  }

  const backdropColors = colour
    ? await detectDominantColorsFromImages({
        paths: fetched.flatMap(({ series }) => {
          const path = backdropToDetect(
            series,
            preferredImagesById.get(series.id),
          );
          return path ? [path] : [];
        }),
        size: 'w780',
      }).catch((error: unknown) => {
        logWarn(
          'Batched dominant colours read failed, continuing without them',
          error,
        );
        return new Map<string, string>();
      })
    : new Map<string, string>();

  return fetched.map(({ images, series }) =>
    withPreferredImages(
      series,
      preferredImagesById.get(series.id),
      series.backdropPath ? backdropColors.get(series.backdropPath) : undefined,
      images,
    ),
  );
}
