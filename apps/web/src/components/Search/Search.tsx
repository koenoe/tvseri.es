'use client';

import { cva } from 'class-variance-authority';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';

import searchIcon from '@/assets/search.svg';
import { DEFAULT_BACKGROUND_COLOR } from '@/constants';
import useMatchMedia from '@/hooks/useMatchMedia';
import { useSearch } from '@/hooks/useSearch';
import getMainBackgroundColor from '@/utils/getMainBackgroundColor';

import { useHeaderStore } from '../Header/HeaderStoreProvider';
import Modal from '../Modal';
import SearchInput, { type SearchInputHandle } from './SearchInput';
import SearchResults from './SearchResults';

const searchIconStyles = cva(
  'relative z-10 mr-[calc(22px+1rem)] cursor-pointer transition-opacity duration-[250ms] md:mr-[calc(24px+1rem)]',
  {
    compoundVariants: [
      {
        className: 'pointer-events-none opacity-10',
        disabled: true,
      },
    ],
    defaultVariants: {
      disabled: false,
    },
    variants: {
      disabled: {
        false: '',
        true: '',
      },
    },
  },
);

function Search() {
  const searchInputRef = useRef<SearchInputHandle>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [backgroundColor, setBackgroundColor] = useState<string>(
    DEFAULT_BACKGROUND_COLOR,
  );
  const router = useRouter();
  const isMenuOpen = useHeaderStore((state) => state.menuOpen);
  const isMobile = useMatchMedia('(max-width: 768px)');
  const isDisabled = isMenuOpen && isMobile;

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
    <>
      <motion.div
        className={searchIconStyles({ disabled: isDisabled })}
        key="search"
        onClick={() => {
          setBackgroundColor(getMainBackgroundColor());
          setIsOpen((prev) => !prev);
        }}
      >
        <motion.div
          className="absolute size-[22px] md:size-[24px] md:rounded-2xl"
          layoutId="search"
        />
        <div className="size-[22px] md:size-[24px]">
          <Image
            alt=""
            className="h-full w-full"
            height={24}
            priority
            src={searchIcon}
            width={24}
          />
        </div>
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
                {(results !== null || isPending) && (
                  <SearchResults
                    isPending={isPending}
                    itemClick={handleClose}
                    results={results}
                  />
                )}
              </motion.div>
            </motion.div>
          </Modal>
        )}
      </AnimatePresence>
    </>
  );
}

export default memo(Search);
