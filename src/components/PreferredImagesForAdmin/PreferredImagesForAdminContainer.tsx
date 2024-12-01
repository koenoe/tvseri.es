import { cookies } from 'next/headers';

import {
  type PreferredImages,
  putPreferredImages,
} from '@/lib/db/preferredImages';
import { findSession } from '@/lib/db/session';
import { findUser } from '@/lib/db/user';
import { fetchTvSeriesImages } from '@/lib/tmdb';
import { decryptToken } from '@/lib/token';

import PreferredImagesForAdmin from './PreferredImagesForAdmin';

async function storePreferredImages(
  id: number,
  preferredImages: PreferredImages,
) {
  'use server';

  await putPreferredImages(id, preferredImages);
}

export default async function PreferredImagesForAdminContainer({
  id,
}: Readonly<{
  id: number;
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

  const images = await fetchTvSeriesImages(id);

  if (!images || images.backdrops.length === 0) {
    return null;
  }

  return (
    <PreferredImagesForAdmin
      action={storePreferredImages}
      id={id}
      images={images}
    />
  );
}
