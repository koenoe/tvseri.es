'use client';

import { useMemo, useState } from 'react';

import { cx } from 'class-variance-authority';
import { AnimatePresence, motion } from 'framer-motion';
import { useSearchParams } from 'next/navigation';

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

  return (
    <div className={cx('flex flex-col gap-4', className)}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex h-11 w-32 cursor-pointer items-center justify-center gap-3 rounded-3xl bg-white/5 px-6 py-4 text-sm leading-none tracking-wide backdrop-blur-xl"
      >
        <div className="flex h-[18px] w-[18px] items-center justify-center">
          {filterCount > 0 ? (
            <span className="flex h-full w-full items-center justify-center rounded-full bg-white text-[11px] font-bold leading-none tracking-tighter text-neutral-800">
              {filterCount}
            </span>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3 w-3"
              viewBox="0 0 24 24"
              fill="currentColor"
              role="img"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M0 6C0 5.17157 0.671573 4.5 1.5 4.5H22.5C23.3284 4.5 24 5.17157 24 6C24 6.82843 23.3284 7.5 22.5 7.5H1.5C0.671573 7.5 0 6.82843 0 6ZM3 12C3 11.1716 3.67157 10.5 4.5 10.5H19.5C20.3284 10.5 21 11.1716 21 12C21 12.8284 20.3284 13.5 19.5 13.5H4.5C3.67157 13.5 3 12.8284 3 12ZM7.5 16.5C6.67157 16.5 6 17.1716 6 18C6 18.8284 6.67157 19.5 7.5 19.5H16.5C17.3284 19.5 18 18.8284 18 18C18 17.1716 17.3284 16.5 16.5 16.5H7.5Z"
              />
            </svg>
          )}
        </div>
        <div>Filters</div>
      </button>
      <AnimatePresence mode="wait">
        {isOpen && (
          <motion.div
            key="filters"
            layout
            className="flex w-full"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'fit-content', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <div className="relative grid grow grid-cols-1 items-start gap-7 rounded-3xl bg-white/5 p-5 md:p-7 lg:grid-cols-3">
              {children}
              {/* <ul>
                <li>air date from/to</li>
              </ul> */}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
