'use client';

import type { UserWithFollowInfo } from '@tvseri.es/schemas';
import { memo } from 'react';

import usePaginated from '@/hooks/usePaginated';
import PaginationNotice from '../Grid/PaginationNotice';
import LoadingDots from '../LoadingDots/LoadingDots';
import Item from './Item';

const getId = (user: UserWithFollowInfo) => user.id;

function Card({
  items: initialItems,
  nextCursor: initialCursor = null,
  title,
  loadMoreUrl,
}: Readonly<{
  items: ReadonlyArray<UserWithFollowInfo>;
  nextCursor?: string | null;
  title: string;
  loadMoreUrl: string;
}>) {
  const { items, canLoadMore, loadMore, status } = usePaginated({
    endpoint: loadMoreUrl,
    getId,
    initialCursor,
    initialItems,
  });
  const isPending = status === 'loading';

  return (
    <div className="rounded-xl bg-neutral-800 p-4 md:p-6">
      <div className="relative w-full">
        <h2 className="w-full text-lg font-medium">{title}</h2>
      </div>
      <div className="flex flex-col gap-2 pt-4 md:pt-6">
        {items.map((user) => (
          <Item key={user.id} user={user} />
        ))}
      </div>
      <PaginationNotice onRetry={loadMore} status={status} />
      {canLoadMore ? (
        <button
          className="mx-auto mt-4 flex h-11 w-auto min-w-36 items-center justify-center gap-x-2 rounded-full border-2 border-white/10 pl-4 pr-6 text-sm font-medium text-white"
          disabled={isPending}
          onClick={loadMore}
        >
          {isPending ? (
            <LoadingDots className="h-2" />
          ) : (
            <>
              <svg
                className="size-5"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  clipRule="evenodd"
                  d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                  fillRule="evenodd"
                />
              </svg>
              Load more
            </>
          )}
        </button>
      ) : null}
    </div>
  );
}

Card.displayName = 'Card';

export default memo(Card);
