import { memo } from 'react';

import { cva, cx } from 'class-variance-authority';
import Image from 'next/image';

import { type Episode } from '@/types/tv-series';
import formatRuntime from '@/utils/formatRuntime';
import svgBase64Shimmer from '@/utils/svgBase64Shimmer';

export const episodeStyles = cva(
  'relative flex-shrink-0 w-[300px] md:w-[400px] lg:w-[500px] overflow-clip rounded-lg shadow-lg bg-white/5 flex flex-col',
);

const placeholder =
  `data:image/svg+xml;base64,${svgBase64Shimmer(489, 275)}` as const;

function EpisodeTile({
  className,
  item,
  priority,
}: Readonly<{ className?: string; item: Episode; priority?: boolean }>) {
  return (
    <div className={cx(episodeStyles(), className)}>
      <div className="relative aspect-video">
        <Image
          className="object-cover"
          draggable={false}
          src={item.stillImage || placeholder}
          alt={item.title}
          fill
          priority={priority}
          placeholder={placeholder}
        />
      </div>
      <div className="relative flex w-full flex-col gap-3 p-4 md:p-6">
        <h2 className="text-base font-semibold leading-normal">{item.title}</h2>
        <p className="line-clamp-3 text-sm leading-normal md:leading-relaxed">
          {item.description}
        </p>
        <div className="mt-1 flex w-full gap-2 text-xs opacity-60 md:text-[0.8rem]">
          <div className="after:ml-2 after:content-['·']">
            {formatRuntime(item.runtime)}
          </div>
          <div className="after:ml-2">{item.airDate.split('T')[0]}</div>
        </div>
      </div>
    </div>
  );
}

export default memo(EpisodeTile);
