'use client';

import { useCallback, useRef, useState, useTransition } from 'react';

import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';

import { type TvSeries } from '@/types/tv-series';

import { useActionButtons } from './ActionButtonsProvider';
import CircleButton from './CircleButton';
import DropdownContainer from '../Dropdown/DropdownContainer';

export default function ContextMenuButton({
  action,
  className,
  tvSeries,
}: Readonly<{
  action: (value: boolean, listType: 'favorites' | 'watchlist') => void;
  className?: string;
  isOpen?: boolean;
  tvSeries: TvSeries;
}>) {
  const [{ isFavorited, isWatchlisted }, setState] = useActionButtons();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleOnClick = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const handleActionClick = useCallback(
    (value: boolean, listType: 'favorites' | 'watchlist') => {
      setState((prevState) => ({
        ...prevState,
        isFavorited: listType === 'favorites' ? value : prevState.isFavorited,
        isWatchlisted:
          listType === 'watchlist' ? value : prevState.isWatchlisted,
      }));

      startTransition(async () => {
        try {
          await action(value, listType);
        } catch (error) {
          console.error(error);
        }
      });
    },
    [action, setState],
  );

  return (
    <div className="relative">
      <CircleButton
        ref={triggerRef}
        className={className}
        onClick={handleOnClick}
        isActive={isOpen}
        isDisabled={isPending}
      >
        <svg
          className="size-7 md:size-9"
          viewBox="0 0 25 25"
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M6.5 11C7.32843 11 8 11.6716 8 12.5C8 13.3284 7.32843 14 6.5 14C5.67157 14 5 13.3284 5 12.5C5 11.6716 5.67157 11 6.5 11Z" />
          <path d="M12.5 11C13.3284 11 14 11.6716 14 12.5C14 13.3284 13.3284 14 12.5 14C11.6716 14 11 13.3284 11 12.5C11 11.6716 11.6716 11 12.5 11Z" />
          <path d="M18.5 11C19.3284 11 20 11.6716 20 12.5C20 13.3284 19.3284 14 18.5 14C17.6716 14 17 13.3284 17 12.5C17 11.6716 17.6716 11 18.5 11Z" />
        </svg>
      </CircleButton>
      <AnimatePresence>
        {isOpen && (
          <DropdownContainer
            triggerRef={triggerRef}
            position={{
              x: 'center',
              y: 'center',
            }}
            offset={{
              x: 0,
              y: 0,
            }}
            onOutsideClick={() => setIsOpen(false)}
            variants={{
              visible: {
                opacity: 1,
                y: 0,
              },
              hidden: {
                opacity: 0,
                y: 0,
              },
            }}
          >
            <motion.div
              className="flex h-36 w-56 flex-col items-center justify-center gap-2 rounded-3xl bg-white p-5 text-neutral-700 shadow-lg"
              initial={{ scale: 0 }}
              animate={{
                scale: 1,
                transformOrigin: 'center center',
                transition: {
                  type: 'spring',
                  stiffness: 400,
                  damping: 25,
                  mass: 1,
                  duration: 0.3,
                },
              }}
              exit={{
                scale: 0,
                transition: {
                  duration: 0.2,
                },
              }}
            >
              <Link
                href={`/track/${tvSeries.id}/${tvSeries.slug}`}
                onClick={() => setIsOpen(false)}
                className="flex w-full flex-nowrap items-center gap-x-2 text-nowrap border-b-2 border-neutral-200 pb-2 text-sm font-medium hover:text-neutral-800"
              >
                <svg
                  fill="currentColor"
                  viewBox="0 0 512 512"
                  xmlns="http://www.w3.org/2000/svg"
                  className="size-5"
                >
                  <circle cx="256" cy="256" r="64" />
                  <path d="M394.82,141.18C351.1,111.2,304.31,96,255.76,96c-43.69,0-86.28,13-126.59,38.48C88.52,160.23,48.67,207,16,256c26.42,44,62.56,89.24,100.2,115.18C159.38,400.92,206.33,416,255.76,416c49,0,95.85-15.07,139.3-44.79C433.31,345,469.71,299.82,496,256,469.62,212.57,433.1,167.44,394.82,141.18ZM256,352a96,96,0,1,1,96-96A96.11,96.11,0,0,1,256,352Z" />
                </svg>
                <span>Edit watch status</span>
              </Link>
              <button
                onClick={() => handleActionClick(!isFavorited, 'favorites')}
                className="flex w-full flex-nowrap items-center gap-x-2 text-nowrap border-b-2 border-neutral-200 pb-2 text-sm font-medium hover:text-neutral-800"
              >
                <svg
                  className="size-5 shrink-0"
                  viewBox="0 0 32 32"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="currentColor"
                >
                  <path d="M26.996 12.898c-.064-2.207-1.084-4.021-2.527-5.13-1.856-1.428-4.415-1.69-6.542-.132-.702.516-1.359 1.23-1.927 2.168-.568-.938-1.224-1.652-1.927-2.167-2.127-1.559-4.685-1.297-6.542.132-1.444 1.109-2.463 2.923-2.527 5.13-.035 1.172.145 2.48.788 3.803 1.01 2.077 5.755 6.695 10.171 10.683l.035.038.002-.002.002.002.036-.038c4.415-3.987 9.159-8.605 10.17-10.683.644-1.323.822-2.632.788-3.804z" />
                </svg>
                <span>
                  {isFavorited ? 'Remove from favorites' : 'Add to favorites'}
                </span>
              </button>
              <button
                onClick={() => handleActionClick(!isWatchlisted, 'watchlist')}
                className="flex w-full flex-nowrap items-center gap-x-2 text-nowrap text-sm font-medium hover:text-neutral-800"
              >
                <svg
                  viewBox="0 0 512 512"
                  xmlns="http://www.w3.org/2000/svg"
                  className="size-5 shrink-0"
                >
                  <g
                    stroke="none"
                    strokeWidth="1"
                    fill="none"
                    fillRule="evenodd"
                  >
                    <g
                      fill="currentColor"
                      transform="translate(42.666667, 42.666667)"
                    >
                      <path d="M213.333333,3.55271368e-14 C331.136,3.55271368e-14 426.666667,95.5306667 426.666667,213.333333 C426.666667,331.136 331.136,426.666667 213.333333,426.666667 C95.5306667,426.666667 3.55271368e-14,331.136 3.55271368e-14,213.333333 C3.55271368e-14,95.5306667 95.5306667,3.55271368e-14 213.333333,3.55271368e-14 Z M213.333333,42.6666667 C119.232,42.6666667 42.6666667,119.232 42.6666667,213.333333 C42.6666667,307.434667 119.232,384 213.333333,384 C307.434667,384 384,307.434667 384,213.333333 C384,119.232 307.434667,42.6666667 213.333333,42.6666667 Z M234.666667,106.666667 L234.666667,225.813333 L292.418278,283.581722 L262.248389,313.751611 L192,243.503223 L192,106.666667 L234.666667,106.666667 Z" />
                    </g>
                  </g>
                </svg>
                <span>
                  {isWatchlisted ? 'Remove from watchlist' : 'Add to watchlist'}
                </span>
              </button>
            </motion.div>
          </DropdownContainer>
        )}
      </AnimatePresence>
    </div>
  );
}
