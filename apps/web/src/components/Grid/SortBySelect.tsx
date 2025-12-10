'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { memo, useCallback, useRef, useState } from 'react';

import DropdownContainer from '../Dropdown/DropdownContainer';

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
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const searchParams = useSearchParams();
  const selectedSortByKey = searchParams.get('sort_by') ?? options[0]!.value;
  const label = options.find((item) => item.value === selectedSortByKey)?.label;
  const handleClick = useCallback(
    (item: Option) => {
      setIsOpen(false);
      const params = new URLSearchParams(searchParams.toString());
      params.set('sort_by', item.value);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  return (
    <div className={className}>
      <div
        className="flex h-11 w-36 cursor-pointer items-center justify-center gap-2 rounded-3xl bg-neutral-800 py-3 pl-5 pr-4 text-sm leading-none tracking-wide backdrop-blur-xl"
        onClick={() => {
          setIsOpen((prev) => !prev);
        }}
        ref={ref}
      >
        <span>{label}</span>
        <motion.svg
          animate={{
            rotate: isOpen ? 180 : 0,
          }}
          className="h-5 w-5"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            clipRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            fillRule="evenodd"
          />
        </motion.svg>
      </div>
      <AnimatePresence>
        {isOpen && (
          <DropdownContainer
            key="select-season"
            onOutsideClick={() => setIsOpen(false)}
            position={{ x: 'center', y: 'end' }}
            triggerRef={ref}
          >
            <div className="relative flex w-36 flex-col gap-2 rounded-lg bg-white p-4 text-black">
              {options.map((item) => (
                <SortBySelectItem
                  item={item}
                  key={item.value}
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
