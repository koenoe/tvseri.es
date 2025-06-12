'use client';

import { type ReactNode, useRef, useEffect, useTransition, memo } from 'react';

import { cx } from 'class-variance-authority';
import { useInView } from 'motion/react';

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
  });

  useEffect(() => {
    if (!sentinelRef.current || isPending) {
      return;
    }

    if (isInView) {
      startTransition(async () => {
        await loadMore();
      });
    }
  }, [isInView, isPending, loadMore]);

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
