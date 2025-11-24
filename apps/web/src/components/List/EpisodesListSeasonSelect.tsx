'use client';

import type { TvSeries } from '@tvseri.es/schemas';
import { AnimatePresence, motion } from 'motion/react';
import { useSearchParams } from 'next/navigation';
import { memo, useMemo, useRef, useState } from 'react';

import DropdownContainer from '../Dropdown/DropdownContainer';

function SelectSeason({ item }: Readonly<{ item: TvSeries }>) {
  const ref = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const searchParams = useSearchParams();
  const selectedSeason = useMemo(
    () =>
      item.seasons?.find(
        (season) =>
          season.seasonNumber.toString() ===
          (searchParams.get('season') ?? '1'),
      ),
    [item.seasons, searchParams],
  );

  return (
    <div className="relative z-10">
      <div
        className="flex cursor-pointer items-center gap-3 text-2xl font-medium"
        onClick={() => {
          setIsOpen((prev) => !prev);
        }}
        ref={ref}
      >
        <span>{selectedSeason?.title}</span>
        <motion.svg
          animate={{
            rotate: isOpen ? 180 : 0,
          }}
          className="h-6 w-6"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            clipRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            fillRule="evenodd"
          ></path>
        </motion.svg>
      </div>
      <AnimatePresence>
        {isOpen && (
          <DropdownContainer
            key="select-season"
            offset={{ x: 0, y: 16 }}
            onOutsideClick={() => {
              setIsOpen(false);
            }}
            position={{ x: 'start', y: 'end' }}
            triggerRef={ref}
          >
            <div className="relative flex w-full flex-col gap-2 rounded-lg bg-white p-4 text-black shadow-lg max-h-[500px] overflow-y-auto">
              {item.seasons?.map((item) => (
                <button
                  className="text-nowrap p-2 text-left text-sm hover:underline"
                  key={item.id}
                  onClick={() => {
                    const params = new URLSearchParams(searchParams.toString());
                    params.set('season', item.seasonNumber.toString());
                    window.history.replaceState(
                      null,
                      '',
                      `?${params.toString()}`,
                    );
                    setIsOpen(false);
                  }}
                >
                  <span className="drop-shadow-lg">{item.title}</span>
                </button>
              ))}
            </div>
          </DropdownContainer>
        )}
      </AnimatePresence>
    </div>
  );
}

export default memo(SelectSeason);
