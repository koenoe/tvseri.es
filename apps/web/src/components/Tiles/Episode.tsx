import type { Episode } from '@tvseri.es/schemas';
import { cva, cx } from 'class-variance-authority';
import { memo, useMemo } from 'react';
import { twMerge } from 'tailwind-merge';

import formatDate from '@/utils/formatDate';
import formatRuntime from '@/utils/formatRuntime';
import svgBase64Shimmer from '@/utils/svgBase64Shimmer';

import WatchButton from '../Buttons/WatchButton';
import ImageWithFallback from '../Image/ImageWithFallback';
import StillPlaceholder from '../Image/StillPlaceholder';

export const episodeStyles = cva(
  'relative flex-shrink-0 w-[300px] md:w-[350px] lg:w-[450px] overflow-clip rounded-lg shadow-lg bg-white/5 flex flex-col',
);

function EpisodeTile({
  className,
  item,
  priority,
  tvSeriesId,
}: Readonly<{
  className?: string;
  item: Episode;
  priority?: boolean;
  tvSeriesId: number;
}>) {
  const showWatchButton = useMemo(
    () => item.seasonNumber > 0 && item.hasAired,
    [item],
  );

  return (
    <div className={cx(episodeStyles(), className)}>
      <div className="relative aspect-video overflow-hidden">
        {item.stillImage ? (
          <>
            <ImageWithFallback
              alt={item.title}
              className="aspect-video h-full w-full object-cover"
              draggable={false}
              fallback={() => <StillPlaceholder className="h-full w-full" />}
              height={608}
              placeholder={`data:image/svg+xml;base64,${svgBase64Shimmer(489, 275)}`}
              priority={priority}
              src={item.stillImage}
              unoptimized
              width={1080}
            />
            <div className="absolute -bottom-1 left-0 h-2/5 w-full bg-gradient-to-t from-black/60 to-transparent" />
          </>
        ) : (
          <StillPlaceholder className="h-full w-full" />
        )}
        {showWatchButton && (
          <WatchButton
            className="!absolute bottom-4 left-4 bg-white/5 backdrop-blur md:bottom-6 md:left-6"
            episodeNumber={item.episodeNumber}
            seasonNumber={item.seasonNumber}
            size="small"
            tvSeriesId={tvSeriesId}
          />
        )}
      </div>
      <div className="relative flex w-full flex-col gap-3 p-4 md:p-6">
        <h2 className="text-base font-semibold leading-normal">{item.title}</h2>
        <p className="line-clamp-3 text-sm leading-normal md:leading-relaxed">
          {item.description}
        </p>
        <div className="mt-1 flex w-full gap-2 text-xs opacity-60 md:text-[0.8rem]">
          {item.runtime ? <div>{formatRuntime(item.runtime)}</div> : null}
          {item.airDate ? (
            <div
              className={twMerge(
                'before:mr-2 before:content-["·"]',
                !item.runtime && 'before:mr-0 before:content-none',
              )}
            >
              {formatDate(item.airDate)}
            </div>
          ) : null}
        </div>
      </div>
      <div className="absolute bottom-[-1.5rem] right-[-1rem] text-[10rem] font-bold leading-none opacity-[0.075] md:bottom-[-1.75rem] md:right-[-1rem] md:text-[12.5rem]">
        {item.episodeNumber}
      </div>
    </div>
  );
}

export default memo(EpisodeTile);
