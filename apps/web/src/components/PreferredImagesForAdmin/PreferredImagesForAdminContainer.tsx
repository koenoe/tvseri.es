import type { PreferredImages } from '@tvseri.es/types';

import { cachedTvSeries } from '@/app/cached';
import auth from '@/auth';
import {
  fetchTvSeriesImages,
  detectDominantColorFromImage,
  updatePreferredImages,
} from '@/lib/api';

import PreferredImagesForAdmin from './PreferredImagesForAdmin';

async function storePreferredImages(
  id: number,
  preferredImages: PreferredImages,
) {
  'use server';

  const { encryptedSessionId } = await auth();

  if (!encryptedSessionId) {
    return;
  }

  await updatePreferredImages({
    id,
    preferredImages,
    sessionId: encryptedSessionId,
  });
}

async function getDominantColor({
  url,
  path,
}: Readonly<{
  url: string;
  path: string;
}>) {
  'use server';

  const color = await detectDominantColorFromImage({
    url: url.replace('w1920_and_h1080_multi_faces', 'w780'),
    cacheKey: path,
  });

  return color;
}

export default async function PreferredImagesForAdminContainer({
  id,
}: Readonly<{
  id: number;
}>) {
  const [tvSeriesFromCache, { user }] = await Promise.all([
    cachedTvSeries(id, {
      includeImages: true,
    }),
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
