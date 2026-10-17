'use client';

import { useCallback } from 'react';

import { useActionButtons } from './ActionButtonsProvider';
import AddButton from './AddButton';

export default function WatchlistButton() {
  const {
    isPending,
    state: { isWatchlisted },
    toggle,
  } = useActionButtons();
  const handleOnClick = useCallback(() => {
    toggle('watchlist');
  }, [toggle]);

  return (
    <AddButton
      isActive={isWatchlisted}
      isDisabled={isPending}
      onClick={handleOnClick}
      title={isWatchlisted ? 'Remove from watchlist' : 'Add to watchlist'}
    />
  );
}
