import Image from 'next/image';
import type { ReactNode } from 'react';

type Props = Readonly<{
  /** the image's alt, the title by default */
  alt?: string;
  /** `eager` for posters above the fold; lazy otherwise */
  loading?: 'eager' | 'lazy';
  /** top-left slot: the Watched label, a New badge… */
  overlay?: ReactNode;
  /** TMDB poster URL; without one the title is drawn on a placeholder */
  poster: string | null | undefined;
  sizes: string;
  title: string;
}>;

/**
 * The 2:3 poster itself: radius from the row
 * (`--tile-radius`, 12 by default), the soft drop shadow (`--tile-shadow`
 * for a board's own), a 1px inner ring
 * and, without art, a dashed placeholder with the title. No link
 * and no hover of its own, so a non-clickable tile can use it too.
 */
export default function PosterArt({
  alt,
  loading,
  overlay,
  poster,
  sizes,
  title,
}: Props) {
  return (
    <span
      className="relative block aspect-2/3 w-full rounded-[var(--tile-radius,12px)] bg-white/5 shadow-[var(--tile-shadow,0_10px_15px_-3px_rgb(0_0_0/0.1),0_4px_6px_-4px_rgb(0_0_0/0.1))] after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:shadow-[inset_0_0_0_1px_rgb(221_238_255/0.08)]"
      data-hairline
    >
      {poster ? (
        <Image
          alt={alt ?? title}
          className="rounded-[inherit] object-cover"
          fill
          loading={loading}
          sizes={sizes}
          src={poster}
        />
      ) : (
        <ArtPlaceholder title={title} />
      )}
      {overlay ? (
        <span className="absolute top-2 left-2 z-2 md:top-2.5 md:left-2.5">
          {overlay}
        </span>
      ) : null}
    </span>
  );
}

/**
 * The placeholder for missing art: a dark gradient with a dashed
 * inset outline and, for a poster, the title. Fills its positioned box.
 */
export function ArtPlaceholder({ title }: Readonly<{ title?: string }>) {
  return (
    <span className="absolute inset-0 flex flex-col justify-end overflow-hidden rounded-[inherit] bg-linear-[165deg,#2b3335_0%,#1a1f20_70%] p-5 before:absolute before:inset-2.5 before:rounded-8 before:border before:border-dashed before:border-white/14">
      {title ? (
        <span className="line-clamp-3 text-body font-semibold text-white">
          {title}
        </span>
      ) : null}
    </span>
  );
}
