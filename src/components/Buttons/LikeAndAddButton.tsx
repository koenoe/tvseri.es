import { cookies } from 'next/headers';

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

    const encryptedSessionId = cookies().get('sessionId')?.value;

    if (!encryptedSessionId) {
      return;
    }

    const decryptedSessionId = decryptToken(encryptedSessionId);
    const { id: accountId } = await fetchAccountDetails(decryptedSessionId);

    if (listType === 'watchlist') {
      await addToOrRemoveFromWatchlist({
        id,
        accountId,
        sessionId: decryptedSessionId,
        value,
      });
    } else if (listType === 'favorites') {
      await addToOrRemoveFromFavorites({
        id,
        accountId,
        sessionId: decryptedSessionId,
        value,
      });
    }
  }

  const encryptedSessionId = cookies().get('sessionId')?.value;

  if (encryptedSessionId) {
    const decryptedSessionId = decryptToken(encryptedSessionId);
    const { isFavorited, isWatchlisted } = await fetchTvSeriesAccountStates(
      id,
      decryptedSessionId,
    );

    return (
      <>
        <LikeButton isActive={isFavorited} action={addToOrRemoveAction} />
        <AddButton isActive={isWatchlisted} action={addToOrRemoveAction} />
      </>
    );
  }

  return (
    <>
      <LikeButton action={addToOrRemoveAction} />
      <AddButton action={addToOrRemoveAction} />
    </>
  );
}
