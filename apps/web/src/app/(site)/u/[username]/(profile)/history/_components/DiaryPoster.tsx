import Image from 'next/image';

import cn from '@/lib/cn';

import { DIARY_POSTER } from './diaryStyles';

/**
 * One `sizes` for the poster and its glow: both pick the same file from the
 * same srcset (w92 on a phone, w154 on a desktop at 2x), so the glow costs
 * no request of its own.
 */
const SIZES = '(max-width: 767px) 40px, 56px';

const POSTER = cn(
  DIARY_POSTER,
  'relative block shrink-0 overflow-hidden bg-white/6 shadow-[0_8px_24px_rgb(0_0_0/0.35)] after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:shadow-[inset_0_0_0_1px_rgb(221_238_255/0.08)]',
);

/**
 * A row's poster (`.c-pw`): one poster, also for a row of several episodes
 * (its expand control already says there is more).
 */
export default function DiaryPoster({ src }: Readonly<{ src: string | null }>) {
  return (
    <span className={POSTER}>
      {src ? (
        <Image alt="" className="object-cover" fill sizes={SIZES} src={src} />
      ) : null}
    </span>
  );
}

/**
 * `.c-glow`: the card's light, its poster blurred (40px) behind the
 * gradient. Painted when the row rasterises (no layer of its own, so a
 * scroll moves pixels already drawn), lazy below the fold like the poster,
 * and skipped with its day off screen (`content-visibility`).
 */
export function DiaryGlow({ src }: Readonly<{ src: string | null }>) {
  return src ? (
    <span aria-hidden="true" className="absolute inset-0 -z-2">
      <Image
        alt=""
        className="object-cover opacity-55 blur-[40px] saturate-130"
        fill
        sizes={SIZES}
        src={src}
      />
    </span>
  ) : null;
}
