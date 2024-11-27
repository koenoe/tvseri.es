import { cookies } from 'next/headers';

import { findSession } from '@/lib/db/session';
import {
  fetchTvSeriesAccountStates,
  addToOrRemoveFromWatchlist,
  fetchAccountDetails,
  addToOrRemoveFromFavorites,
} from '@/lib/tmdb';
import { decryptToken } from '@/lib/token';

import AddButton from './AddButton';
import LikeButton from './LikeButton';

export default async function LikeAndAddButton({
  id,
}: Readonly<{
  id: number | string;
}>) {
  async function addToOrRemoveAction(
    value: boolean,
    listType: 'favorites' | 'watchlist',
  ) {
    'use server';

    const cookieStore = await cookies();
    const encryptedSessionId = cookieStore.get('sessionId')?.value;

    if (!encryptedSessionId) {
      return;
    }

    const decryptedSessionId = decryptToken(encryptedSessionId);
    const session = await findSession(decryptedSessionId);

    if (!session?.tmdbSessionId) {
      return;
    }

    const { id: accountId } = await fetchAccountDetails(session.tmdbSessionId);

    if (listType === 'watchlist') {
      await addToOrRemoveFromWatchlist({
        id,
        accountId,
        sessionId: session.tmdbSessionId,
        value,
      });
    } else if (listType === 'favorites') {
      await addToOrRemoveFromFavorites({
        id,
        accountId,
        sessionId: session.tmdbSessionId,
        value,
      });
    }
  }

  const cookieStore = await cookies();
  const encryptedSessionId = cookieStore.get('sessionId')?.value;

  if (encryptedSessionId) {
    const decryptedSessionId = decryptToken(encryptedSessionId);
    const session = await findSession(decryptedSessionId);

    if (session?.tmdbSessionId) {
      const { isFavorited, isWatchlisted } = await fetchTvSeriesAccountStates(
        id,
        session.tmdbSessionId,
      );

      return (
        <>
          <LikeButton isActive={isFavorited} action={addToOrRemoveAction} />
          <AddButton isActive={isWatchlisted} action={addToOrRemoveAction} />
        </>
      );
    }
  }

  return (
    <>
      <LikeButton action={addToOrRemoveAction} />
      <AddButton action={addToOrRemoveAction} />
    </>
  );
}
