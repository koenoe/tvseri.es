'use client';

import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';

import searchIcon from '@/assets/search.svg';
import { DEFAULT_BACKGROUND_COLOR } from '@/constants';
import { useSearch } from '@/hooks/useSearch';
import getMainBackgroundColor from '@/utils/getMainBackgroundColor';

import Modal from '../Modal';
import SearchInput, { type SearchInputHandle } from './SearchInput';
import SearchResults from './SearchResults';

function Search() {
  const searchInputRef = useRef<SearchInputHandle>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [backgroundColor, setBackgroundColor] = useState<string>(
    DEFAULT_BACKGROUND_COLOR,
  );
  const router = useRouter();

  const { results, isPending, handleSearch, reset } = useSearch();

  const handleClose = useCallback(() => {
    setIsOpen(false);
    reset();
    searchInputRef.current?.reset();
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
        className="relative z-10 mr-[calc(24px+1.25rem)] cursor-pointer"
        key="search"
        onClick={() => {
          setBackgroundColor(getMainBackgroundColor());
          setIsOpen((prev) => !prev);
        }}
      >
        <motion.div
          className="absolute h-[24px] w-[24px] md:rounded-2xl"
          layoutId="search"
        />
        <Image alt="" height={24} priority src={searchIcon} width={24} />
      </motion.div>
      <AnimatePresence>
        {isOpen && (
          <Modal>
            <motion.div
              animate="visible"
              className="fixed inset-0 z-40"
              exit="hidden"
              initial="hidden"
              key="modal-backdrop"
              onClick={handleClose}
              style={{
                backgroundColor,
              }}
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
            />
            <motion.div
              className="pointer-events-none fixed inset-0 z-50 flex md:mt-[8rem] md:items-start md:justify-center"
              key="modal-container"
              layout
              layoutId="search"
            >
              <motion.div
                className="pointer-events-auto flex w-full max-w-screen-md flex-col bg-white shadow-xl md:overflow-hidden md:rounded-2xl"
                key="modal-content"
                style={{
                  color: backgroundColor,
                }}
              >
                <SearchInput
                  className="border-b border-black/5 md:border-none"
                  color={backgroundColor}
                  onChange={handleSearch}
                  onClose={handleClose}
                  onKeyDown={handleKeyDown}
                  ref={searchInputRef}
                />
                <AnimatePresence>
                  {(results !== null || isPending) && (
                    <motion.div
                      className="relative h-full w-full overflow-y-auto overflow-x-hidden p-6 md:h-auto md:max-h-[calc(100vh-20rem)] md:border-t md:border-black/10"
                      key="results"
                    >
                      <SearchResults
                        isPending={isPending}
                        itemClick={handleClose}
                        results={results}
                      />
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
