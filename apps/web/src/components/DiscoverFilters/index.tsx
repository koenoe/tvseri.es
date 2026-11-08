'use client';

import { cx } from 'class-variance-authority';
import { AnimatePresence, motion } from 'motion/react';
import { useSearchParams } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';

import { FilterIcon } from '@/components/Icons/FilterIcon';

export default function DiscoverFilters({
  className,
  children,
}: Readonly<{
  className?: string;
  children?: React.ReactNode;
}>) {
  const [isOpen, setIsOpen] = useState(false);
  const searchParams = useSearchParams();
  const filterCount = useMemo(() => {
    return [...searchParams.keys()].filter((key) => key !== 'sort_by').length;
  }, [searchParams]);

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  return (
    <div className={cx('flex flex-col gap-4', className)}>
      <button
        className="flex h-11 w-32 cursor-pointer items-center justify-center gap-3 rounded-3xl bg-neutral-800 px-6 py-4 text-sm leading-none tracking-wide backdrop-blur-xl"
        onClick={handleToggle}
      >
        <div className="flex h-[18px] w-[18px] items-center justify-center">
          {filterCount > 0 ? (
            <span className="flex h-full w-full items-center justify-center rounded-full bg-white text-[11px] font-bold leading-none tracking-tighter text-neutral-900">
              {filterCount}
            </span>
          ) : (
            <FilterIcon className="h-3 w-3" />
          )}
        </div>
        <div>Filters</div>
      </button>
      <AnimatePresence mode="wait">
        {isOpen ? (
          <motion.div
            animate={{ height: 'fit-content', opacity: 1 }}
            className="flex w-full"
            exit={{ height: 0, opacity: 0 }}
            initial={{ height: 0, opacity: 0 }}
            key="filters"
            layout
          >
            <div className="relative grid grow grid-cols-1 items-start gap-7 rounded-3xl bg-neutral-800 p-5 md:p-7 lg:grid-cols-3">
              {children}
              {/* <ul>
                <li>air date from/to</li>
              </ul> */}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
