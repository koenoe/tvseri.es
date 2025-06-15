import { cachedTvSeries } from '@/app/cached';
import auth from '@/auth';
import { fetchTvSeriesImages } from '@/lib/api';
import {
  type PreferredImages,
  putPreferredImages,
} from '@/lib/db/preferredImages';
import detectDominantColorFromImage from '@/lib/detectDominantColorFromImage';

import PreferredImagesForAdmin from './PreferredImagesForAdmin';

async function storePreferredImages(
  id: number,
  preferredImages: PreferredImages,
) {
  'use server';

  await Promise.all([
    putPreferredImages(id, preferredImages),
    // TODO: figure out how to invalidate Cloudfront API cache, lol
    // deleteCacheItem(`tv:${id}`),
    // deleteCacheItem('trending'),
  ]);
}

async function getDominantColor({
  url,
  path,
}: Readonly<{
  url: string;
  path: string;
}>) {
  'use server';

  const color = await detectDominantColorFromImage(
    url.replace('w1920_and_h1080_multi_faces', 'w780'),
    path,
  );

  return color;
}

export default async function PreferredImagesForAdminContainer({
  id,
}: Readonly<{
  id: number;
}>) {
  const [tvSeriesFromCache, { user }] = await Promise.all([
    cachedTvSeries(id),
    auth(),
  ]);
  const tvSeries = tvSeriesFromCache!;

  if (user?.role !== 'admin') {
    return null;
  }

  const images = await fetchTvSeriesImages(
    tvSeries.id,
    tvSeries.originalLanguage,
  );

  if (!images || images.backdrops.length <= 1) {
    return null;
  }

  return (
    <PreferredImagesForAdmin
      id={tvSeries.id}
      images={images}
      getDominantColor={getDominantColor}
      storePreferredImages={storePreferredImages}
    />
  );
}
