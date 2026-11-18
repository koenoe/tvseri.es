import 'server-only';

import { loadSeriesOrNull } from '@/lib/series/loaders';

import type { UpNextArt } from './UpNextItemCard';

/**
 * The art an Up next card draws of a show (backdrop, title treatment): only
 * that crosses to the client. null without a show or when its read failed.
 */
export async function loadUpNextArt(
  seriesId: number | undefined,
): Promise<UpNextArt | null> {
  if (seriesId === undefined) {
    return null;
  }
  const series = await loadSeriesOrNull(seriesId);
  return series
    ? {
        backdropImage: series.backdropImage,
        titleTreatmentImage: series.titleTreatmentImage,
      }
    : null;
}
