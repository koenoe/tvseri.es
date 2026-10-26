import type { PreferredImages } from '@tvseri.es/schemas';
import { updateTag } from 'next/cache';
import { unauthorized } from 'next/navigation';

import { cachedTvSeries } from '@/app/cached';
import auth from '@/auth';
import {
  deletePreferredImages,
  detectDominantColorFromImage,
  fetchTvSeriesImages,
  updatePreferredImages,
} from '@/lib/api';

import PreferredImagesForAdmin from './PreferredImagesForAdmin';

const TMDB_IMAGE_URL_PREFIX = 'https://image.tmdb.org/t/p/';

async function requireAdminAccessToken() {
  const { accessToken, user } = await auth();

  if (user?.role !== 'admin' || !accessToken) {
    unauthorized();
  }

  return accessToken;
}

// Mirrors the API's CDN purge (series + trending) for the web caches.
function updatePreferredImagesTags(id: number) {
  updateTag(`series:${id}`);
  updateTag('collection:trending');
}

async function storePreferredImages(
  id: number,
  preferredImages: PreferredImages,
) {
  'use server';

  const accessToken = await requireAdminAccessToken();

  await updatePreferredImages({
    accessToken,
    id,
    preferredImages,
  });

  updatePreferredImagesTags(id);
}

async function resetPreferredImages(id: number) {
  'use server';

  const accessToken = await requireAdminAccessToken();

  await deletePreferredImages({
    accessToken,
    id,
  });

  updatePreferredImagesTags(id);
}

async function getDominantColor(url: string) {
  'use server';

  const { user } = await auth();

  if (user?.role !== 'admin') {
    unauthorized();
  }

  // Server actions are public endpoints: only accept TMDB image URLs.
  // The API derives the cache key from the URL path.
  if (!url.startsWith(TMDB_IMAGE_URL_PREFIX)) {
    throw new Error('Only TMDB image URLs are supported');
  }

  return detectDominantColorFromImage({
    url: url.replace('w1920_and_h1080_multi_faces', 'w780'),
  });
}

export default async function PreferredImagesForAdminContainer({
  id,
}: Readonly<{
  id: number;
}>) {
  const [tvSeries, { user }] = await Promise.all([
    cachedTvSeries(id, {
      includeImages: true,
    }),
    auth(),
  ]);

  if (!tvSeries || user?.role !== 'admin') {
    return null;
  }

  const images = await fetchTvSeriesImages(
    tvSeries.id,
    tvSeries.originalLanguage,
  );

  if (!images || images.backdrops.length <= 1) {
    return null;
  }

  // Remount when the served images change (e.g. after a reset), so the
  // panel's backdrop/title position matches what's on screen again.
  const panelKey = `${tvSeries.backdropImage}|${tvSeries.titleTreatmentImage}`;

  return (
    <PreferredImagesForAdmin
      getDominantColor={getDominantColor}
      id={tvSeries.id}
      images={images}
      key={panelKey}
      resetPreferredImages={resetPreferredImages}
      storePreferredImages={storePreferredImages}
    />
  );
}
