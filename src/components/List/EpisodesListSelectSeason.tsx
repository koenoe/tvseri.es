'use client';

import { memo, useMemo, useState } from 'react';

import { AnimatePresence, motion } from 'framer-motion';
import { useSearchParams } from 'next/navigation';

import { type TvSeries } from '@/types/tv-series';
import getMousePosition from '@/utils/getMousePosition';

import DropdownContainer, {
  type Position,
} from '../Dropdown/DropdownContainer';

function SelectSeason({ item }: Readonly<{ item: TvSeries }>) {
  const [position, setPosition] = useState<Position | null>(null);
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
        onClick={(event: React.MouseEvent<HTMLDivElement>) => {
          const { x, y } = getMousePosition(event);
          setPosition((prevPosition) =>
            prevPosition ? null : { x, y: y + 32 + 16 },
          );
        }}
      >
        <span>{selectedSeason?.title}</span>
        <motion.svg
          className="h-6 w-6"
          viewBox="0 0 20 20"
          fill="currentColor"
          animate={{
            rotate: position ? 180 : 0,
          }}
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          ></path>
        </motion.svg>
      </div>
      <AnimatePresence mode="wait">
        {position && (
          <DropdownContainer
            key="select-season"
            position={position}
            onOutsideClick={() => setPosition(null)}
          >
            <div className="relative flex w-full flex-col gap-2 rounded-lg bg-white p-4 text-black">
              {item.seasons?.map((item) => (
                <button
                  key={item.id}
                  className="text-nowrap p-2 text-left text-sm hover:underline"
                  onClick={() => {
                    const params = new URLSearchParams(searchParams.toString());
                    params.set('season', item.seasonNumber.toString());
                    window.history.replaceState(
                      null,
                      '',
                      `?${params.toString()}`,
                    );
                    setPosition(null);
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
