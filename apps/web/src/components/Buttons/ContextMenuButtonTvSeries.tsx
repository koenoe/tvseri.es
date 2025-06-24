'use client';

import { useCallback, useRef, useTransition } from 'react';

import { type TvSeries } from '@tvseri.es/types';
import Link from 'next/link';

import { useActionButtons } from './ActionButtonsProvider';
import ContextMenuButton, {
  type ContextMenuButtonHandle,
} from './ContextMenuButton';

export default function ContextMenuButtonTvSeries({
  action,
  className,
  tvSeries,
}: Readonly<{
  action: (value: boolean, listType: 'favorites' | 'watchlist') => void;
  className?: string;
  isOpen?: boolean;
  tvSeries: TvSeries;
}>) {
  const [{ isFavorited, isWatchlisted }, setState] = useActionButtons();
  const [isPending, startTransition] = useTransition();
  const contextMenuButtonRef = useRef<ContextMenuButtonHandle>(null);

  const handleActionClick = useCallback(
    (value: boolean, listType: 'favorites' | 'watchlist') => {
      setState((prevState) => ({
        ...prevState,
        isFavorited: listType === 'favorites' ? value : prevState.isFavorited,
        isWatchlisted:
          listType === 'watchlist' ? value : prevState.isWatchlisted,
      }));

      startTransition(async () => {
        try {
          await action(value, listType);
        } catch (error) {
          console.error(error);
        }
      });
    },
    [action, setState],
  );

  return (
    <ContextMenuButton className={className} isDisabled={isPending}>
      <Link
        onClick={() => contextMenuButtonRef.current?.close()}
        href={{
          pathname: `/track/${tvSeries.id}/${tvSeries.slug}`,
        }}
        className="flex w-full flex-nowrap items-center gap-x-2 text-nowrap border-b-2 border-neutral-200 pb-3 text-sm font-medium hover:text-neutral-800"
      >
        <svg
          fill="currentColor"
          viewBox="0 0 512 512"
          xmlns="http://www.w3.org/2000/svg"
          className="size-5"
        >
          <circle cx="256" cy="256" r="64" />
          <path d="M394.82,141.18C351.1,111.2,304.31,96,255.76,96c-43.69,0-86.28,13-126.59,38.48C88.52,160.23,48.67,207,16,256c26.42,44,62.56,89.24,100.2,115.18C159.38,400.92,206.33,416,255.76,416c49,0,95.85-15.07,139.3-44.79C433.31,345,469.71,299.82,496,256,469.62,212.57,433.1,167.44,394.82,141.18ZM256,352a96,96,0,1,1,96-96A96.11,96.11,0,0,1,256,352Z" />
        </svg>
        <span>Edit watch history</span>
      </Link>
      <button
        onClick={() => handleActionClick(!isFavorited, 'favorites')}
        className="flex w-full flex-nowrap items-center gap-x-2 text-nowrap border-b-2 border-neutral-200 pb-3 text-sm font-medium hover:text-neutral-800"
      >
        <svg
          className="size-5 shrink-0"
          viewBox="0 0 32 32"
          xmlns="http://www.w3.org/2000/svg"
          fill="currentColor"
        >
          <path d="M26.996 12.898c-.064-2.207-1.084-4.021-2.527-5.13-1.856-1.428-4.415-1.69-6.542-.132-.702.516-1.359 1.23-1.927 2.168-.568-.938-1.224-1.652-1.927-2.167-2.127-1.559-4.685-1.297-6.542.132-1.444 1.109-2.463 2.923-2.527 5.13-.035 1.172.145 2.48.788 3.803 1.01 2.077 5.755 6.695 10.171 10.683l.035.038.002-.002.002.002.036-.038c4.415-3.987 9.159-8.605 10.17-10.683.644-1.323.822-2.632.788-3.804z" />
        </svg>
        <span>
          {isFavorited ? 'Remove from favorites' : 'Add to favorites'}
        </span>
      </button>
      <button
        onClick={() => handleActionClick(!isWatchlisted, 'watchlist')}
        className="flex w-full flex-nowrap items-center gap-x-2 text-nowrap text-sm font-medium hover:text-neutral-800"
      >
        <svg
          viewBox="0 0 512 512"
          xmlns="http://www.w3.org/2000/svg"
          className="size-5 shrink-0"
        >
          <g stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
            <g fill="currentColor" transform="translate(42.666667, 42.666667)">
              <path d="M213.333333,3.55271368e-14 C331.136,3.55271368e-14 426.666667,95.5306667 426.666667,213.333333 C426.666667,331.136 331.136,426.666667 213.333333,426.666667 C95.5306667,426.666667 3.55271368e-14,331.136 3.55271368e-14,213.333333 C3.55271368e-14,95.5306667 95.5306667,3.55271368e-14 213.333333,3.55271368e-14 Z M234.666667,106.666667 L192,106.666667 L192,243.503223 L262.248389,313.751611 L292.418278,283.581722 L234.666667,225.813333 L234.666667,106.666667 Z"></path>
            </g>
          </g>
        </svg>
        <span>
          {isWatchlisted ? 'Remove from watchlist' : 'Add to watchlist'}
        </span>
      </button>
    </ContextMenuButton>
  );
}
