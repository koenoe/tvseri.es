'use client';

import type { UserWithFollowInfo } from '@tvseri.es/types';
import { memo, useCallback, useState, useTransition } from 'react';
import LoadingDots from '../LoadingDots/LoadingDots';
import Item from './Item';

function Card({
  items: itemsFromProps,
  nextCursor: nextCursorFromProps = null,
  title,
  loadMoreUrl,
}: Readonly<{
  items: UserWithFollowInfo[];
  nextCursor?: string | null;
  title: string;
  loadMoreUrl: string;
}>) {
  const [isPending, startTransition] = useTransition();
  const [items, setItems] = useState(itemsFromProps);
  const [nextCursor, setNextCursor] = useState<string | null>(
    nextCursorFromProps,
  );

  const fetchItems = useCallback(
    async (cursor: string) => {
      const response = await fetch(`${loadMoreUrl}?cursor=${cursor}`);
      const result = (await response.json()) as Readonly<{
        items: UserWithFollowInfo[];
        nextCursor: string | null;
      }>;
      return result;
    },
    [loadMoreUrl],
  );

  const handleLoadMore = useCallback(() => {
    if (!nextCursor) {
      return;
    }

    startTransition(async () => {
      const result = await fetchItems(nextCursor);
      const { items: newItems, nextCursor: nextCursorFromResult } = result;

      // Note: shouldn't happen, but extra safeguard
      if (newItems.length === 0) {
        setNextCursor(null);
        return;
      }

      setNextCursor(nextCursorFromResult);
      setItems((prevItems) => [...prevItems, ...newItems]);
    });
  }, [fetchItems, nextCursor]);

  return (
    <div className="rounded-lg bg-white/5 p-4 md:p-6">
      <div className="relative w-full">
        <h2 className="w-full text-lg font-medium">{title}</h2>
      </div>
      <div className="flex flex-col gap-2 pt-4 md:pt-6">
        {items.map((user) => (
          <Item key={user.id} user={user} />
        ))}
      </div>
      {nextCursor ? (
        <button
          className="mx-auto mt-4 flex h-11 w-auto min-w-36 items-center justify-center gap-x-2 rounded-full border-2 border-white/10 pl-4 pr-6 text-sm font-medium text-white"
          disabled={isPending}
          onClick={handleLoadMore}
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

export default memo(Card);
