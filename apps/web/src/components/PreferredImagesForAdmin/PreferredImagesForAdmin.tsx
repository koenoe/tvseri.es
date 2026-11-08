'use client';

import type { PreferredImages } from '@tvseri.es/schemas';
import { cx } from 'class-variance-authority';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react';
import { preload } from 'react-dom';
import { toast } from 'sonner';
import { useShallow } from 'zustand/shallow';

import { SpinnerIcon } from '@/components/Icons/SpinnerIcon';
import type { fetchTvSeriesImages } from '@/lib/api';
import preloadImage from '@/utils/preloadImage';

import { useBackground } from '../Background/BackgroundProvider';

type Direction = 'prev' | 'next';

const getTitleTreatmentElement = () =>
  document.getElementById('title-treatment');

type Backdrop = Readonly<{
  url: string;
  path: string;
  color: string;
}>;

export default function PreferredImagesForAdmin({
  id,
  images,
  getDominantColor,
  resetPreferredImages,
  storePreferredImages,
}: Readonly<{
  id: number;
  images: Awaited<ReturnType<typeof fetchTvSeriesImages>>;
  getDominantColor: (url: string) => Promise<string>;
  resetPreferredImages: (id: number) => Promise<void>;
  storePreferredImages: (
    id: number,
    preferredImages: PreferredImages,
  ) => Promise<void>;
}>) {
  const imagesPreloaded = useRef<boolean>(false);
  const [isPending, startTransition] = useTransition();
  const [preloading, setPreloading] = useState<Direction | null>(null);
  const { backgroundColor, backgroundImage, setBackground } = useBackground(
    useShallow((state) => ({
      backgroundColor: state.backgroundColor,
      backgroundImage: state.backgroundImage,
      setBackground: state.setBackground,
    })),
  );
  const backdrop = useMemo(
    () => images?.backdrops?.find((image) => image.url === backgroundImage),
    [backgroundImage, images?.backdrops],
  );

  const [currentBackdrop, setCurrentBackdrop] = useState<Backdrop>({
    color: backgroundColor,
    path: backdrop?.path ?? '',
    url: backdrop?.url ?? backgroundImage,
  });
  const [currentTitleIndex, setCurrentTitleIndex] = useState(-1);
  const currentBackdropIndex = useMemo(
    () =>
      images?.backdrops?.findIndex(
        (backdrop) => backdrop.url === currentBackdrop.url,
      ) ?? 0,
    [images?.backdrops, currentBackdrop.url],
  );

  const handleBackdropNavigation = useCallback(
    (direction: Direction) => {
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

      const newBackdrop = images.backdrops[newIndex];

      if (newIndex === currentBackdropIndex || !newBackdrop) {
        return;
      }

      setPreloading(direction);

      startTransition(async () => {
        try {
          const [dominantColor, preloadedImage] = await Promise.all([
            getDominantColor(newBackdrop.url),
            preloadImage(newBackdrop.url),
          ]);

          setCurrentBackdrop({
            color: dominantColor,
            path: newBackdrop.path,
            url: preloadedImage,
          });

          setBackground({
            backgroundColor: dominantColor,
            backgroundImage: newBackdrop.url,
          });
        } catch (error) {
          console.error('Loading backdrop failed', {
            error,
            newBackdrop,
          });
        }

        setPreloading(null);
      });
    },
    [images?.backdrops, currentBackdropIndex, getDominantColor, setBackground],
  );

  const handleTitleNavigation = useCallback(
    (direction: Direction) => {
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
        images.titleTreatment[newIndex]!.url,
      );
      setCurrentTitleIndex(newIndex);
    },
    [images, currentTitleIndex],
  );

  const handleBackdropPrev = useCallback(() => {
    handleBackdropNavigation('prev');
  }, [handleBackdropNavigation]);

  const handleBackdropNext = useCallback(() => {
    handleBackdropNavigation('next');
  }, [handleBackdropNavigation]);

  const handleTitlePrev = useCallback(() => {
    handleTitleNavigation('prev');
  }, [handleTitleNavigation]);

  const handleTitleNext = useCallback(() => {
    handleTitleNavigation('next');
  }, [handleTitleNavigation]);

  const handleSave = useCallback(() => {
    startTransition(async () => {
      try {
        const currentTitle = images?.titleTreatment[currentTitleIndex];
        if (currentBackdrop?.path) {
          await storePreferredImages(id, {
            backdropColor: currentBackdrop.color,
            backdropImagePath: currentBackdrop.path,
            ...(currentTitle && {
              titleTreatmentImagePath: currentTitle.path,
            }),
          });
          toast.success('Preferred images successfully stored.');
        }
      } catch (_error) {
        toast.error('Failed to store preferred images.');
      }
    });
  }, [id, images, currentTitleIndex, currentBackdrop, storePreferredImages]);

  const handleReset = useCallback(() => {
    if (
      !window.confirm(
        'Reset to the default background and title treatment for this series?',
      )
    ) {
      return;
    }

    startTransition(async () => {
      try {
        await resetPreferredImages(id);
        toast.success('Preferred images reset.');
      } catch (_error) {
        toast.error('Failed to reset preferred images.');
      }
    });
  }, [id, resetPreferredImages]);

  const canNavigateBackdrops = images?.backdrops && images.backdrops.length > 1;

  const canNavigateTitles =
    images?.titleTreatment && images.titleTreatment.length > 1;

  const isFirstBackdrop = currentBackdropIndex === 0;

  const isLastBackdrop =
    images?.backdrops && currentBackdropIndex === images.backdrops.length - 1;

  const isFirstTitle = currentTitleIndex === 0;

  const isLastTitle =
    images?.titleTreatment &&
    currentTitleIndex === images.titleTreatment.length - 1;

  const spinner = useMemo(
    () => (
      <SpinnerIcon
        className="inline h-4 w-4 animate-spin"
        fill={backgroundColor}
      />
    ),
    [backgroundColor],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: zip it
  useEffect(() => {
    if (!images?.titleTreatment) {
      return;
    }

    const currentSrc = getTitleTreatmentElement()?.getAttribute('src');
    if (currentSrc) {
      const index = images.titleTreatment.findIndex(
        (title) => title.url === currentSrc,
      );
      setCurrentTitleIndex(index);
    }
  }, []);

  useEffect(() => {
    if (!images?.backdrops?.length || imagesPreloaded.current) {
      return;
    }

    images?.backdrops.forEach((backdrop) => {
      preload(backdrop.url, { as: 'image' });
    });

    imagesPreloaded.current = true;
  }, [images?.backdrops]);

  return (
    <div className="fixed bottom-10 right-10 z-[99999] flex gap-2 rounded-lg p-4 text-white backdrop-blur-2xl">
      <button
        className={cx('aspect-square w-8 rounded bg-white/40', {
          'cursor-not-allowed opacity-30':
            !canNavigateBackdrops || isFirstBackdrop,
        })}
        disabled={!canNavigateBackdrops || isFirstBackdrop || !!preloading}
        onClick={handleBackdropPrev}
        title="Previous background"
      >
        {preloading === 'prev' ? spinner : '⬅️'}
      </button>
      <button
        className={cx('aspect-square w-8 rounded bg-white/40', {
          'cursor-not-allowed opacity-30': !canNavigateTitles || isFirstTitle,
        })}
        disabled={!canNavigateTitles || isFirstTitle}
        onClick={handleTitlePrev}
        title="Previous title treatment"
      >
        «
      </button>
      <button
        className={cx('aspect-square w-8 rounded bg-white/40', {
          'cursor-not-allowed opacity-30': !canNavigateTitles || isLastTitle,
        })}
        disabled={!canNavigateTitles || isLastTitle}
        onClick={handleTitleNext}
        title="Next title treatment"
      >
        »
      </button>
      <button
        className={cx('aspect-square w-8 rounded bg-white/40', {
          'cursor-not-allowed opacity-30':
            !canNavigateBackdrops || isLastBackdrop,
        })}
        disabled={!canNavigateBackdrops || isLastBackdrop || !!preloading}
        onClick={handleBackdropNext}
        title="Next background"
      >
        {preloading === 'next' ? spinner : '➡️'}
      </button>
      <button
        className={cx('ml-8 aspect-square w-8 rounded bg-white/40', {
          'cursor-progress': isPending,
        })}
        disabled={isPending}
        onClick={handleSave}
        title="Save changes"
      >
        💾
      </button>
      <button
        className={cx('aspect-square w-8 rounded bg-white/40', {
          'cursor-progress': isPending,
        })}
        disabled={isPending}
        onClick={handleReset}
        title="Reset to default images"
      >
        🔄
      </button>
    </div>
  );
}
