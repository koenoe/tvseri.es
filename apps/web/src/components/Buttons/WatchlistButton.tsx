'use client';

import { useCallback, useTransition } from 'react';

import { useActionButtons } from './ActionButtonsProvider';
import AddButton from './AddButton';

export default function WatchlistButton({
  action,
}: Readonly<{
  action: (value: boolean, listType: 'favorites' | 'watchlist') => void;
}>) {
  const [{ isWatchlisted }, setState] = useActionButtons();
  const [isPending, startTransition] = useTransition();
  const handleOnClick = useCallback(
    (value: boolean) => {
      setState((prevState) => ({
        ...prevState,
        isWatchlisted: value,
      }));
      startTransition(async () => {
        try {
          await action(value, 'watchlist');
        } catch (error) {
          console.error(error);
        }
      });
    },
    [action, setState],
  );

  return (
    <AddButton
      isActive={isWatchlisted}
      isDisabled={isPending}
      onClick={handleOnClick}
      title={isWatchlisted ? 'Remove from watchlist' : 'Add to watchlist'}
    />
  );
}
