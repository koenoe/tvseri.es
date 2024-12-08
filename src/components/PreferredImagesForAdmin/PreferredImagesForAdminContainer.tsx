import { cookies } from 'next/headers';

import {
  type PreferredImages,
  putPreferredImages,
} from '@/lib/db/preferredImages';
import { findSession } from '@/lib/db/session';
import { findUser } from '@/lib/db/user';
import { fetchTvSeriesImages } from '@/lib/tmdb';
import { decryptToken } from '@/lib/token';
import { type TvSeries } from '@/types/tv-series';

import PreferredImagesForAdmin from './PreferredImagesForAdmin';

async function storePreferredImages(
  id: number,
  preferredImages: PreferredImages,
) {
  'use server';

  await putPreferredImages(id, preferredImages);
}

export default async function PreferredImagesForAdminContainer({
  tvSeries,
}: Readonly<{
  tvSeries: TvSeries;
}>) {
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
      action={storePreferredImages}
      id={tvSeries.id}
      images={images}
    />
  );
}
