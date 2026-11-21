import type { SeriesImages } from '@tvseri.es/schemas';
import { findPreferredImages } from '@/lib/db/preferredImages';
import { fetchTvSeriesImages } from '@/lib/tmdb/series';

/**
 * The admin image picker's choices: `fetchTvSeriesImages` plus the saved pick
 * (without its key and bookkeeping), so the strips can mark it.
 */
export async function fetchTvSeriesImageChoices(
  id: number,
  originalLanguage?: string,
): Promise<SeriesImages | undefined> {
  const [images, preferred] = await Promise.all([
    fetchTvSeriesImages(id, originalLanguage),
    findPreferredImages(id),
  ]);

  return (
    images && {
      ...images,
      preferred: preferred && {
        backdropColor: preferred.backdropColor,
        backdropImagePath: preferred.backdropImagePath,
        ...(preferred.titleTreatment === 'text' && {
          titleTreatment: preferred.titleTreatment,
        }),
        ...(preferred.titleTreatmentImagePath && {
          titleTreatmentImagePath: preferred.titleTreatmentImagePath,
        }),
      },
    }
  );
}
