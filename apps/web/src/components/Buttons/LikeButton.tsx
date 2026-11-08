'use client';

import { useCallback } from 'react';

import { HeartIcon } from '@/components/Icons/HeartIcon';
import { useActionButtons } from './ActionButtonsProvider';
import CircleButton from './CircleButton';

export default function LikeButton() {
  const {
    isPending,
    state: { isFavorited },
    toggle,
  } = useActionButtons();
  const handleOnClick = useCallback(() => {
    toggle('favorites');
  }, [toggle]);

  return (
    <CircleButton
      isActive={isFavorited}
      isDisabled={isPending}
      onClick={handleOnClick}
      title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
    >
      <HeartIcon className="size-6 md:size-7" />
    </CircleButton>
  );
}
