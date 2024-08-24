'use client';

import { type ReactNode, useRef, useEffect, useTransition, memo } from 'react';

import { cx } from 'class-variance-authority';
import { useInView } from 'framer-motion';

import createUseRestorableRef from '@/hooks/createUseRestorableRef';

const useRestorableLastFetchedPage = createUseRestorableRef<number>();

const InfiniteScroll = ({
  className,
  children,
  hasMoreData,
  loadMore,
  scrollRestoreKey,
}: Readonly<{
  children: ReactNode;
  className?: string;
  hasMoreData: boolean;
  scrollRestoreKey: string;
  loadMore: (page: number) => Promise<unknown>;
}>) => {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [isPending, startTransition] = useTransition();
  const isInView = useInView(sentinelRef, {
    amount: 'some',
  });
  const [getLastFetchedPage, setLastFetchedPage] = useRestorableLastFetchedPage(
    scrollRestoreKey,
    1,
  );

  useEffect(() => {
    if (!sentinelRef.current || isPending) {
      return;
    }

    if (isInView) {
      startTransition(async () => {
        const pageToFetch = getLastFetchedPage() + 1;
        await loadMore(pageToFetch);
        setLastFetchedPage(pageToFetch);
      });
    }
  }, [getLastFetchedPage, isInView, isPending, loadMore, setLastFetchedPage]);

  return (
    <>
      <div className={cx('relative', className)}>
        {children}
        {hasMoreData && (
          <div
            ref={sentinelRef}
            className="pointer-events-none absolute bottom-0 left-0 block h-[25vh] w-full"
          />
        )}
      </div>
    </>
  );
};

export default memo(InfiniteScroll);
