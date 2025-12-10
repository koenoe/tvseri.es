'use client';

import { cx } from 'class-variance-authority';
import { useInView } from 'motion/react';
import { memo, type ReactNode, useEffect, useRef, useTransition } from 'react';

const InfiniteScroll = ({
  className,
  children,
  hasMoreData,
  loadMore,
}: Readonly<{
  children: ReactNode;
  className?: string;
  hasMoreData: boolean;
  loadMore: () => Promise<unknown>;
}>) => {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [isPending, startTransition] = useTransition();
  const isInView = useInView(sentinelRef, {
    amount: 'some',
    margin: '0px 0px 2000px 0px',
  });

  useEffect(() => {
    if (isInView && hasMoreData && !isPending) {
      startTransition(async () => {
        await loadMore();
      });
    }
  }, [isInView, hasMoreData, isPending, loadMore]);

  return (
    <div className={cx('relative', className)}>
      {children}
      {hasMoreData && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 h-px w-full"
          ref={sentinelRef}
        />
      )}
    </div>
  );
};

InfiniteScroll.displayName = 'InfiniteScroll';

export default memo(InfiniteScroll);
