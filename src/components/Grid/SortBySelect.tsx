'use client';

import { memo, useCallback, useRef, useState } from 'react';

import { AnimatePresence, motion } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';

import getMousePosition from '@/utils/getMousePosition';

import DropdownContainer, {
  type Position,
} from '../Dropdown/DropdownContainer';

type Option = Readonly<{
  label: string;
  value: string;
}>;

function SortBySelectItem({
  item,
  onClick,
}: Readonly<{ item: Option; onClick: (item: Option) => void }>) {
  const handleClick = useCallback(() => {
    onClick(item);
  }, [item, onClick]);

  return (
    <button
      className="text-nowrap p-2 text-left text-sm hover:underline"
      onClick={handleClick}
    >
      <span className="drop-shadow-lg">{item.label}</span>
    </button>
  );
}

function SortBySelect({
  className,
  options,
}: Readonly<{
  className?: string;
  options: Option[];
}>) {
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const searchParams = useSearchParams();
  const selectedSortByKey = searchParams.get('sort_by') ?? options[0].value;
  const label = options.find((item) => item.value === selectedSortByKey)?.label;
  const handleClick = useCallback(
    (item: Option) => {
      setPosition(null);
      const params = new URLSearchParams(searchParams.toString());
      params.set('sort_by', item.value);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  return (
    <div className={className}>
      <div
        ref={ref}
        className="flex h-11 w-36 cursor-pointer items-center justify-center gap-2 rounded-3xl bg-white/5 py-3 pl-5 pr-4 text-sm leading-none tracking-wide backdrop-blur-xl"
        onClick={(event: React.MouseEvent<HTMLDivElement>) => {
          const { x, y } = getMousePosition(event);
          setPosition((prevPosition) =>
            prevPosition ? null : { x, y: y + 60 },
          );
        }}
      >
        <span>{label}</span>
        <motion.svg
          className="h-5 w-5"
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
      <AnimatePresence>
        {position && (
          <DropdownContainer
            key="select-season"
            position={position}
            onOutsideClick={() => setPosition(null)}
          >
            <div className="relative flex w-[9rem] flex-col gap-2 rounded-lg bg-white p-4 text-black">
              {options.map((item) => (
                <SortBySelectItem
                  key={item.value}
                  item={item}
                  onClick={handleClick}
                />
              ))}
            </div>
          </DropdownContainer>
        )}
      </AnimatePresence>
    </div>
  );
}

export default memo(SortBySelect);
