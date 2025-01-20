'use client';

import { memo, useCallback, useEffect, useState } from 'react';

import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useDebouncedCallback } from 'use-debounce';

import searchIcon from '@/assets/search.svg';
import { DEFAULT_BACKGROUND_COLOR } from '@/constants';
import { useSearch } from '@/hooks/useSearch';
import getMainBackgroundColor from '@/utils/getMainBackgroundColor';

import Modal from '../Modal';
import SearchResults from './SearchResults';

function Search() {
  const [isOpen, setIsOpen] = useState(false);
  const [backgroundColor, setBackgroundColor] = useState<string>(
    DEFAULT_BACKGROUND_COLOR,
  );
  const router = useRouter();

  const { results, isPending, handleSearch, reset } = useSearch();

  const handleClose = useCallback(() => {
    setIsOpen(false);
    reset();
  }, [reset]);

  const handleKeyDown = useDebouncedCallback((event: React.KeyboardEvent) => {
    if (!isPending && event.key === 'Enter') {
      const firstResult = results?.[0];
      if (firstResult) {
        router.push(`/tv/${firstResult.id}/${firstResult.slug}`);
        handleClose();
      }
    }
  }, 100);

  const handleGlobalKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (
        (navigator.userAgent.toLowerCase().match(/mac/i)
          ? event.metaKey
          : event.ctrlKey) &&
        (event.key === 'k' || event.key === 'f')
      ) {
        event.preventDefault();
        event.stopPropagation();

        setIsOpen((currentValue) => {
          if (!currentValue) {
            setBackgroundColor(getMainBackgroundColor());
          }
          return !currentValue;
        });
      } else if (event.key === 'Escape') {
        handleClose();
      }
    },
    [handleClose],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleGlobalKeyDown);

    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [handleGlobalKeyDown]);

  return (
    <LayoutGroup>
      <motion.div
        key="search"
        className="relative z-10 mr-[calc(24px+1.25rem)] cursor-pointer"
        onClick={() => {
          setBackgroundColor(getMainBackgroundColor());
          setIsOpen((prev) => !prev);
        }}
      >
        <motion.div
          layoutId="search"
          className="absolute h-[24px] w-[24px] md:rounded-2xl"
        />
        <Image src={searchIcon} alt="" width={24} height={24} priority />
      </motion.div>
      <AnimatePresence>
        {isOpen && (
          <Modal>
            <motion.div
              style={{
                backgroundColor,
              }}
              className="fixed inset-0 z-40"
              key="modal-backdrop"
              variants={{
                hidden: {
                  opacity: 0,
                  transition: {
                    duration: 0.16,
                  },
                },
                visible: {
                  opacity: 0.7,
                  transition: {
                    delay: 0.04,
                    duration: 0.2,
                  },
                },
              }}
              initial="hidden"
              exit="hidden"
              animate="visible"
              onClick={handleClose}
            />
            <motion.div
              className="pointer-events-none fixed inset-0 z-50 flex md:mt-[8rem] md:items-start md:justify-center"
              key="modal-container"
              layoutId="search"
              layout
            >
              <motion.div
                className="pointer-events-auto flex w-full max-w-screen-md flex-col bg-white shadow-xl md:overflow-hidden md:rounded-2xl"
                key="modal-content"
                style={{
                  color: backgroundColor,
                }}
              >
                <div className="relative h-auto w-full border-b border-black/5 md:border-none">
                  <div className="absolute inset-y-0 start-0 flex items-center ps-6">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      className="h-6 w-6"
                    >
                      <path
                        fill={backgroundColor}
                        fillRule="evenodd"
                        d="M10.667 2a8.667 8.667 0 0 1 6.937 13.862l4.035 4.036a1.231 1.231 0 0 1-1.74 1.741l-4.037-4.035A8.667 8.667 0 1 1 10.667 2m0 2.667a6 6 0 1 0 0 12 6 6 0 0 0 0-12"
                      />
                    </svg>
                  </div>
                  <input
                    type="search"
                    className="block w-full bg-transparent p-6 ps-16 placeholder-black/30 focus:outline-none"
                    placeholder="search tvseri.es"
                    required
                    autoFocus
                    onChange={handleSearch}
                    onKeyDown={handleKeyDown}
                  />
                  <button
                    type="button"
                    className="absolute right-6 top-6 bg-white focus:outline-none"
                    onClick={handleClose}
                  >
                    <svg
                      viewBox="0 0 15 15"
                      xmlns="http://www.w3.org/2000/svg"
                      className="size-6"
                    >
                      <path
                        d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z"
                        fill={backgroundColor}
                        fillRule="evenodd"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
                <AnimatePresence>
                  {(results !== null || isPending) && (
                    <motion.div
                      className="relative h-full w-full overflow-y-auto overflow-x-hidden p-6 md:h-auto md:max-h-[calc(100vh-20rem)] md:border-t md:border-black/10"
                      key="results"
                    >
                      <SearchResults results={results} isPending={isPending} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </motion.div>
          </Modal>
        )}
      </AnimatePresence>
    </LayoutGroup>
  );
}

export default memo(Search);
