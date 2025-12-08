'use client';

import { cva } from 'class-variance-authority';
import type { Variants } from 'motion/react';
import { AnimatePresence, animate, motion, useMotionValue } from 'motion/react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

const MODAL_TRANSITION = {
  duration: 0.5,
  ease: [0.32, 0.72, 0, 1],
} as const;

const backdropVariants: Variants = {
  hidden: {
    opacity: 0,
    transition: { duration: 0.16 },
  },
  visible: {
    opacity: 0.7,
    transition: { delay: 0.04, duration: 0.2 },
  },
};

const searchIconStyles = cva(
  'relative z-10 mr-[calc(22px+1rem)] cursor-pointer transition-opacity duration-300 md:mr-[calc(24px+1rem)]',
  {
    defaultVariants: {
      state: 'enabled',
    },
    variants: {
      state: {
        disabled: 'pointer-events-none opacity-10',
        enabled: '',
      },
    },
  },
);

const modalStyles = cva(
  'pointer-events-auto flex flex-col overflow-hidden bg-white shadow-xl md:origin-top',
  {
    defaultVariants: {
      state: 'hidden',
    },
    variants: {
      state: {
        hidden: 'size-6 rounded-xl',
        visible:
          'fixed inset-0 rounded-none md:inset-auto md:left-1/2 md:top-32 md:h-auto md:w-full md:max-w-screen-md md:rounded-2xl',
      },
    },
  },
);

function SearchComponent() {
  const searchInputRef = useRef<SearchInputHandle>(null);
  const iconRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [backgroundColor, setBackgroundColor] = useState<string>(
    DEFAULT_BACKGROUND_COLOR,
  );
  const router = useRouter();
  const isMenuOpen = useHeaderStore((state) => state.menuOpen);
  const isMobile = useMatchMedia('(max-width: 768px)');
  const isDisabled = useMemo(
    () => isMenuOpen && isMobile,
    [isMenuOpen, isMobile],
  );

  const { handleSearch, isPending, reset, results } = useSearch();

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const scale = useMotionValue(1);
  const opacity = useMotionValue(1);

  const getIconOffset = useCallback(() => {
    if (!iconRef.current) {
      return { x: 0, y: 0 };
    }

    const rect = iconRef.current.getBoundingClientRect();
    const iconCenterX = rect.left + rect.width / 2;
    const iconCenterY = rect.top + rect.height / 2;

    if (isMobile) {
      // Mobile: modal is inset:0 (fullscreen), center at (windowWidth/2, windowHeight/2)
      return {
        x: iconCenterX - window.innerWidth / 2,
        y: iconCenterY - window.innerHeight / 2,
      };
    }

    // Desktop: modal is centered horizontally via left:50% + translateX(-50%), top at 8rem
    // The modal has center origin, so we offset from where the modal center will be
    // X: modal center is at windowWidth/2 (due to left:50% + translateX(-50%))
    // Y: we don't know modal height, so just offset from modal's top position
    const remInPx = parseFloat(
      getComputedStyle(document.documentElement).fontSize,
    );
    const modalTop = remInPx * 8; // top-32 = 8rem

    return {
      x: iconCenterX - window.innerWidth / 2,
      y: iconCenterY - modalTop,
    };
  }, [isMobile]);

  const animateToIcon = useCallback(() => {
    const offset = getIconOffset();
    animate(x, offset.x, MODAL_TRANSITION);
    animate(y, offset.y, MODAL_TRANSITION);
    animate(scale, 0.03, MODAL_TRANSITION);
    return animate(opacity, 0, MODAL_TRANSITION);
  }, [getIconOffset, opacity, scale, x, y]);

  const animateToModal = useCallback(() => {
    animate(x, 0, MODAL_TRANSITION);
    animate(y, 0, MODAL_TRANSITION);
    animate(scale, 1, MODAL_TRANSITION);
    animate(opacity, 1, MODAL_TRANSITION);
  }, [opacity, scale, x, y]);

  const handleClose = useCallback(() => {
    animateToIcon().then(() => {
      setIsOpen(false);
      reset();
      searchInputRef.current?.reset();
    });
  }, [animateToIcon, reset]);

  const handleOpen = useCallback(() => {
    const offset = getIconOffset();
    x.set(offset.x);
    y.set(offset.y);
    scale.set(0);
    opacity.set(0);
    setBackgroundColor(getMainBackgroundColor());
    setIsOpen(true);
  }, [getIconOffset, opacity, scale, x, y]);

  const handleIconClick = useCallback(() => {
    if (isOpen) {
      handleClose();
    } else {
      handleOpen();
    }
  }, [handleClose, handleOpen, isOpen]);

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
      const isMac = navigator.userAgent.toLowerCase().includes('mac');
      const modifierPressed = isMac ? event.metaKey : event.ctrlKey;

      if (modifierPressed && (event.key === 'k' || event.key === 'f')) {
        event.preventDefault();
        event.stopPropagation();

        if (isOpen) {
          handleClose();
        } else {
          handleOpen();
        }
      } else if (event.key === 'Escape') {
        handleClose();
      }
    },
    [handleClose, handleOpen, isOpen],
  );

  const hasResults = useMemo(
    () => results !== null || isPending,
    [results, isPending],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleGlobalKeyDown);

    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleGlobalKeyDown]);

  // Animate to modal position after React renders
  useEffect(() => {
    if (isOpen) {
      animateToModal();
    }
  }, [isOpen, animateToModal]);

  return (
    <>
      <motion.div
        className={searchIconStyles({
          state: isDisabled ? 'disabled' : 'enabled',
        })}
        onClick={handleIconClick}
        ref={iconRef}
      >
        {/* layoutId enables shared element transition with Header logo morph */}
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
              style={{ backgroundColor }}
              variants={backdropVariants}
            />
            <div className="pointer-events-none fixed inset-0 z-50">
              {/* We use motion values (x, y, scale, opacity) with manual animate() calls
                  instead of layout animations. Layout animations would conflict with the
                  layoutId="search" shared element transition used for the Header logo morph. */}
              <motion.div
                className={modalStyles({ state: 'visible' })}
                key="modal-content"
                style={{ color: backgroundColor, opacity, scale, x, y }}
                transformTemplate={({ x, y, scale }) =>
                  isMobile
                    ? `translate(${x}, ${y}) scale(${scale})`
                    : `translate(calc(-50% + ${x}), ${y}) scale(${scale})`
                }
              >
                <SearchInput
                  className="border-b border-black/5 md:border-none"
                  color={backgroundColor}
                  onChange={handleSearch}
                  onClose={handleClose}
                  onKeyDown={handleKeyDown}
                  ref={searchInputRef}
                />
                {hasResults && (
                  <SearchResults
                    isPending={isPending}
                    itemClick={handleClose}
                    results={results}
                  />
                )}
              </motion.div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </>
  );
}

SearchComponent.displayName = 'Search';

export default memo(SearchComponent);
