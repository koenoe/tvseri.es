import Image from 'next/image';

import cn from '@/lib/cn';

// The fan: the two back posters at 86%, turned 9°
// and pushed out 46% (12° and 56% on hover); the front one straight.
const BACK = [
  '-translate-x-[46%] -rotate-9 scale-86 opacity-75 group-hover/tile:-translate-x-[56%] group-hover/tile:-rotate-12',
  'translate-x-[46%] rotate-9 scale-86 opacity-75 group-hover/tile:translate-x-[56%] group-hover/tile:rotate-12',
  '',
] as const;

/** Three posters fanned at the top of a lens tile (decorative) */
export default function LensDeck({
  first,
  loading,
  posters,
}: Readonly<{
  first: boolean;
  loading: 'eager' | 'lazy';
  posters: ReadonlyArray<string | null>;
}>) {
  const deckClass = cn(
    'absolute top-3 left-1/2 h-21 w-14 -translate-x-1/2 md:top-5.5 md:h-34.5 md:w-23',
    first && 'top-4.5 h-31.5 w-21 md:top-17.5 md:h-56.25 md:w-37.5',
  );
  return (
    <span aria-hidden className={deckClass}>
      {posters.map((poster, index) => {
        const posterClass = cn(
          'absolute inset-0 overflow-hidden rounded-6 bg-white/5 shadow-[0_18px_30px_-12px_rgb(0_0_0/0.85)] transition-transform duration-400 ease-[cubic-bezier(0.2,0.8,0.2,1)] image-rim md:rounded-8',
          BACK[index],
        );
        return (
          <span className={posterClass} key={index}>
            {poster ? (
              <Image
                alt=""
                className="object-cover"
                fill
                loading={loading}
                sizes={first ? '150px' : '92px'}
                src={poster}
              />
            ) : null}
          </span>
        );
      })}
    </span>
  );
}
