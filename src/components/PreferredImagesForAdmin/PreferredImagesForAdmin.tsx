'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from 'react';

import { cx } from 'class-variance-authority';

import { type PreferredImages } from '@/lib/db/preferredImages';
import { type fetchTvSeriesImages } from '@/lib/tmdb';

import { usePageStore } from '../Page/PageProvider';

const getTitleTreatmentElement = () =>
  document.getElementById('title-treatment');

export default function PreferredImagesForAdmin({
  action,
  id,
  images,
}: Readonly<{
  action: (id: number, preferredImages: PreferredImages) => Promise<void>;
  id: number;
  images: Awaited<ReturnType<typeof fetchTvSeriesImages>>;
}>) {
  const [isPending, startTransition] = useTransition();
  const currentImage = usePageStore((state) => state.backgroundImage);
  const currentColor = usePageStore((state) => state.backgroundColor);
  const updateBackground = usePageStore((state) => state.setBackground);

  const [currentBackdropIndex, setCurrentBackdropIndex] = useState(
    () =>
      images?.backdrops?.findIndex(
        (backdrop) => backdrop.url === currentImage,
      ) ?? -1,
  );
  const [currentTitleIndex, setCurrentTitleIndex] = useState(-1);

  const handleBackdropNavigation = useCallback(
    (direction: 'prev' | 'next') => {
      if (!images?.backdrops) {
        return;
      }

      const newIndex = Math.min(
        Math.max(
          0,
          direction === 'prev'
            ? currentBackdropIndex - 1
            : currentBackdropIndex + 1,
        ),
        images.backdrops.length - 1,
      );

      if (newIndex === currentBackdropIndex) {
        return;
      }

      const newBackground = images.backdrops[newIndex];
      updateBackground({
        backgroundImage: newBackground.url,
        backgroundColor: newBackground.color,
      });
      setCurrentBackdropIndex(newIndex);
    },
    [images?.backdrops, currentBackdropIndex, updateBackground],
  );

  const handleTitleNavigation = useCallback(
    (direction: 'prev' | 'next') => {
      if (!images?.titleTreatment) {
        return;
      }

      const newIndex = Math.min(
        Math.max(
          0,
          direction === 'prev' ? currentTitleIndex - 1 : currentTitleIndex + 1,
        ),
        images.titleTreatment.length - 1,
      );

      if (newIndex === currentTitleIndex) {
        return;
      }

      getTitleTreatmentElement()?.setAttribute(
        'src',
        images.titleTreatment[newIndex].url,
      );
      setCurrentTitleIndex(newIndex);
    },
    [images, currentTitleIndex],
  );

  const canNavigateBackdrops = useMemo(
    () => images?.backdrops && images.backdrops.length > 1,
    [images?.backdrops],
  );

  const canNavigateTitles = useMemo(
    () => images?.titleTreatment && images.titleTreatment.length > 1,
    [images?.titleTreatment],
  );

  const isFirstBackdrop = useMemo(
    () => currentBackdropIndex === 0,
    [currentBackdropIndex],
  );

  const isLastBackdrop = useMemo(
    () =>
      images?.backdrops && currentBackdropIndex === images.backdrops.length - 1,
    [images?.backdrops, currentBackdropIndex],
  );

  const isFirstTitle = useMemo(
    () => currentTitleIndex === 0,
    [currentTitleIndex],
  );

  const isLastTitle = useMemo(
    () =>
      images?.titleTreatment &&
      currentTitleIndex === images.titleTreatment.length - 1,
    [images?.titleTreatment, currentTitleIndex],
  );

  useEffect(() => {
    if (!images?.titleTreatment) return;

    const currentSrc = getTitleTreatmentElement()?.getAttribute('src');
    if (currentSrc) {
      const index = images.titleTreatment.findIndex(
        (title) => title.url === currentSrc,
      );
      setCurrentTitleIndex(index);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="fixed bottom-10 right-10 z-[99999] flex gap-2 rounded-lg p-4 text-white"
      style={{
        backgroundColor: currentColor,
      }}
    >
      <button
        className={cx('aspect-square w-8 rounded bg-white/40', {
          'cursor-not-allowed opacity-30':
            !canNavigateBackdrops || isFirstBackdrop,
        })}
        onClick={() => handleBackdropNavigation('prev')}
        disabled={!canNavigateBackdrops || isFirstBackdrop}
        title="Previous background"
      >
        ⬅️
      </button>
      <button
        className={cx('aspect-square w-8 rounded bg-white/40', {
          'cursor-not-allowed opacity-30': !canNavigateTitles || isFirstTitle,
        })}
        onClick={() => handleTitleNavigation('prev')}
        disabled={!canNavigateTitles || isFirstTitle}
        title="Previous title treatment"
      >
        «
      </button>
      <button
        className={cx('aspect-square w-8 rounded bg-white/40', {
          'cursor-not-allowed opacity-30': !canNavigateTitles || isLastTitle,
        })}
        onClick={() => handleTitleNavigation('next')}
        disabled={!canNavigateTitles || isLastTitle}
        title="Next title treatment"
      >
        »
      </button>
      <button
        className={cx('aspect-square w-8 rounded bg-white/40', {
          'cursor-not-allowed opacity-30':
            !canNavigateBackdrops || isLastBackdrop,
        })}
        onClick={() => handleBackdropNavigation('next')}
        disabled={!canNavigateBackdrops || isLastBackdrop}
        title="Next background"
      >
        ➡️
      </button>
      <button
        className={cx('ml-8 aspect-square w-8 rounded bg-white/40', {
          'cursor-progress': isPending,
        })}
        onClick={() => {
          startTransition(async () => {
            const currentBackdrop = images?.backdrops[currentBackdropIndex];
            const currentTitle = images?.titleTreatment[currentTitleIndex];

            if (currentBackdrop) {
              await action(id, {
                backdropImagePath: currentBackdrop.path,
                backdropColor: currentBackdrop.color,
                ...(currentTitle && {
                  titleTreatmentImagePath: currentTitle.path,
                }),
              });
            }
          });
        }}
        title="Save changes"
        disabled={isPending}
      >
        💾
      </button>
    </div>
  );
}
