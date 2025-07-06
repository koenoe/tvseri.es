'use client';

import type { PreferredImages } from '@tvseri.es/types';
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

import type { fetchTvSeriesImages } from '@/lib/api';
import preloadImage from '@/utils/preloadImage';

import { usePageStore } from '../Page/PageStoreProvider';

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
  storePreferredImages,
}: Readonly<{
  id: number;
  images: Awaited<ReturnType<typeof fetchTvSeriesImages>>;
  getDominantColor: (
    args: Readonly<{
      url: string;
      path: string;
    }>,
  ) => Promise<string>;
  storePreferredImages: (
    id: number,
    preferredImages: PreferredImages,
  ) => Promise<void>;
}>) {
  const imagesPreloaded = useRef<boolean>(false);
  const [isPending, startTransition] = useTransition();
  const [preloading, setPreloading] = useState<Direction | null>(null);
  const currentImage = usePageStore((state) => state.backgroundImage);
  const updateBackground = usePageStore((state) => state.setBackground);
  const color = usePageStore((state) => state.backgroundColor);
  const backdrop = useMemo(
    () => images?.backdrops?.find((image) => image.url === currentImage),
    [currentImage, images?.backdrops],
  );

  const [currentBackdrop, setCurrentBackdrop] = useState<Backdrop>({
    color,
    path: backdrop?.path ?? '',
    url: backdrop?.url ?? currentImage,
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
          const [color, preloadedImage] = await Promise.all([
            getDominantColor(newBackdrop),
            preloadImage(newBackdrop.url),
          ]);

          setCurrentBackdrop({
            color,
            path: newBackdrop.path,
            url: preloadedImage,
          });

          updateBackground({
            backgroundColor: color,
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
    [
      images?.backdrops,
      currentBackdropIndex,
      getDominantColor,
      updateBackground,
    ],
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

  const spinner = useMemo(
    () => (
      <svg
        className="0 inline h-4 w-4 animate-spin"
        fill="none"
        viewBox="0 0 100 101"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
          fill={color}
        />
        <path
          d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
          fill="#fff"
        />
      </svg>
    ),
    [color],
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
    if (
      !images?.backdrops ||
      !images.backdrops.length ||
      imagesPreloaded.current
    ) {
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
        onClick={() => handleBackdropNavigation('prev')}
        title="Previous background"
      >
        {preloading === 'prev' ? spinner : '⬅️'}
      </button>
      <button
        className={cx('aspect-square w-8 rounded bg-white/40', {
          'cursor-not-allowed opacity-30': !canNavigateTitles || isFirstTitle,
        })}
        disabled={!canNavigateTitles || isFirstTitle}
        onClick={() => handleTitleNavigation('prev')}
        title="Previous title treatment"
      >
        «
      </button>
      <button
        className={cx('aspect-square w-8 rounded bg-white/40', {
          'cursor-not-allowed opacity-30': !canNavigateTitles || isLastTitle,
        })}
        disabled={!canNavigateTitles || isLastTitle}
        onClick={() => handleTitleNavigation('next')}
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
        onClick={() => handleBackdropNavigation('next')}
        title="Next background"
      >
        {preloading === 'next' ? spinner : '➡️'}
      </button>
      <button
        className={cx('ml-8 aspect-square w-8 rounded bg-white/40', {
          'cursor-progress': isPending,
        })}
        disabled={isPending}
        onClick={() => {
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
        }}
        title="Save changes"
      >
        💾
      </button>
    </div>
  );
}
