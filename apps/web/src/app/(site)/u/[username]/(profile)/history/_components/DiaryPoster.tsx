import Image from 'next/image';

import cn from '@/lib/cn';

import { DIARY_POSTER } from './diaryStyles';

/**
 * A row's poster (`.pp`): one poster, also for a row of several episodes
 * (its expand button already says there is more).
 */
export default function DiaryPoster({ src }: Readonly<{ src: string | null }>) {
  const poster = cn(DIARY_POSTER, 'relative block bg-white/6 object-cover');
  return src ? (
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
  );
}
