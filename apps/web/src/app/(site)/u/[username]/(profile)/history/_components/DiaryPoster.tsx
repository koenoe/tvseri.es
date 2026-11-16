import Image from 'next/image';

import cn from '@/lib/cn';

import { DIARY_POSTER } from './diaryStyles';

/**
 * A row's poster (`.pp`); a row of several episodes shows a second card
 * peeking behind it (`.stk`: 4px right, 4px up).
 */
export default function DiaryPoster({
  src,
  stacked,
}: Readonly<{ src: string | null; stacked: boolean }>) {
  const poster = cn(DIARY_POSTER, 'relative block bg-white/6 object-cover');
  return (
    <span className="relative">
      {stacked ? (
        <span
          aria-hidden="true"
          className={cn(DIARY_POSTER, 'absolute -top-1 left-1 bg-white/14')}
        />
      ) : null}
      {src ? (
        <Image
          alt=""
          className={poster}
          height={60}
          sizes="40px"
          src={src}
          width={40}
        />
      ) : (
        <span aria-hidden="true" className={poster} />
      )}
    </span>
  );
}
