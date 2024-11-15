import { memo } from 'react';

import { cva, cx } from 'class-variance-authority';

import { type Episode } from '@/types/tv-series';
import formatRuntime from '@/utils/formatRuntime';
import svgBase64Shimmer from '@/utils/svgBase64Shimmer';

import ImageWithFallback from '../Image/ImageWithFallback';

export const episodeStyles = cva(
  'relative flex-shrink-0 w-[300px] md:w-[350px] lg:w-[450px] overflow-clip rounded-lg shadow-lg bg-white/5 flex flex-col',
);

const renderFallbackStill = () => (
  <div className="flex h-full w-full items-center justify-center bg-white/5">
    <svg
      fill="#ffffff"
      height="100px"
      width="100px"
      version="1.1"
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      viewBox="0 0 58 58"
      xmlSpace="preserve"
      stroke="#ffffff"
      className="opacity-10"
    >
      <g strokeWidth="0"></g>
      <g strokeLinecap="round" strokeLinejoin="round"></g>
      <g>
        <g>
          <path d="M57,6H1C0.448,6,0,6.447,0,7v44c0,0.553,0.448,1,1,1h56c0.552,0,1-0.447,1-1V7C58,6.447,57.552,6,57,6z M56,50H2V8h54V50z"></path>
          <path d="M16,28.138c3.071,0,5.569-2.498,5.569-5.568C21.569,19.498,19.071,17,16,17s-5.569,2.498-5.569,5.569 C10.431,25.64,12.929,28.138,16,28.138z M16,19c1.968,0,3.569,1.602,3.569,3.569S17.968,26.138,16,26.138s-3.569-1.601-3.569-3.568 S14.032,19,16,19z"></path>
          <path d="M7,46c0.234,0,0.47-0.082,0.66-0.249l16.313-14.362l10.302,10.301c0.391,0.391,1.023,0.391,1.414,0s0.391-1.023,0-1.414 l-4.807-4.807l9.181-10.054l11.261,10.323c0.407,0.373,1.04,0.345,1.413-0.062c0.373-0.407,0.346-1.04-0.062-1.413l-12-11 c-0.196-0.179-0.457-0.268-0.72-0.262c-0.265,0.012-0.515,0.129-0.694,0.325l-9.794,10.727l-4.743-4.743 c-0.374-0.373-0.972-0.392-1.368-0.044L6.339,44.249c-0.415,0.365-0.455,0.997-0.09,1.412C6.447,45.886,6.723,46,7,46z"></path>
        </g>
      </g>
    </svg>
  </div>
);

function EpisodeTile({
  className,
  item,
  priority,
}: Readonly<{ className?: string; item: Episode; priority?: boolean }>) {
  return (
    <div className={cx(episodeStyles(), className)}>
      <div className="relative aspect-video">
        {item.stillImage ? (
          <ImageWithFallback
            className="aspect-video h-full w-full object-cover"
            draggable={false}
            src={item.stillImage}
            alt={item.title}
            priority={priority}
            placeholder={`data:image/svg+xml;base64,${svgBase64Shimmer(489, 275)}`}
            width={1080}
            height={608}
            unoptimized
            fallback={renderFallbackStill}
          />
        ) : (
          <>{renderFallbackStill()}</>
        )}
      </div>
      <div className="relative flex w-full flex-col gap-3 p-4 md:p-6">
        <h2 className="text-base font-semibold leading-normal">{item.title}</h2>
        <p className="line-clamp-3 text-sm leading-normal md:leading-relaxed">
          {item.description}
        </p>
        <div className="mt-1 flex w-full gap-2 text-xs opacity-60 md:text-[0.8rem]">
          {item.runtime && (
            <div className="after:ml-2 after:content-['·']">
              {formatRuntime(item.runtime)}
            </div>
          )}
          <div className="after:ml-2">{item.airDate.split('T')[0]}</div>
        </div>
      </div>
      <div className="absolute bottom-[-1.5rem] right-[-1rem] text-[10rem] font-bold leading-none opacity-[0.075] md:bottom-[-1.75rem] md:right-[-1rem] md:text-[12.5rem]">
        {item.episodeNumber}
      </div>
    </div>
  );
}

export default memo(EpisodeTile);
