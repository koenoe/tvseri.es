import { revalidateTag } from 'next/cache';
import { cookies } from 'next/headers';

import { cachedTvSeries } from '@/lib/cached';
import { deleteCacheItem } from '@/lib/db/cache';
import {
  type PreferredImages,
  putPreferredImages,
} from '@/lib/db/preferredImages';
import { findSession } from '@/lib/db/session';
import { findUser } from '@/lib/db/user';
import detectDominantColorFromImage from '@/lib/detectDominantColorFromImage';
import { fetchTvSeriesImages } from '@/lib/tmdb';
import { decryptToken } from '@/lib/token';

import PreferredImagesForAdmin from './PreferredImagesForAdmin';

async function storePreferredImages(
  id: number,
  preferredImages: PreferredImages,
) {
  'use server';

  revalidateTag('trending');

  await Promise.all([
    putPreferredImages(id, preferredImages),
    deleteCacheItem(`tv:${id}`),
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
  const tvSeriesFromCache = await cachedTvSeries(id);
  const tvSeries = tvSeriesFromCache!;
  const cookieStore = await cookies();
  const encryptedSessionId = cookieStore.get('sessionId')?.value;

  if (!encryptedSessionId) {
    return null;
  }

  const decryptedSessionId = decryptToken(encryptedSessionId);
  const session = await findSession(decryptedSessionId);

  if (!session) {
    return null;
  }

  const user = await findUser({ userId: session.userId });
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
