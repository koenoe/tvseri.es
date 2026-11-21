import Image from 'next/image';
import type { MouseEventHandler } from 'react';

import { PICTURE_LAYER } from '@/components/ui/picture/pictureSurface';
import TileLink from '@/components/ui/tile/TileLink';
import cn from '@/lib/cn';

/** A phone's fade from the foot */
const PHONE_SHADE =
  'absolute inset-0 bg-[linear-gradient(0deg,rgb(22_27_29)_0%,rgb(22_27_29/0.5)_45%,rgb(22_27_29/0)_100%)] md:hidden';

const SIDE_SHADE =
  'absolute inset-0 bg-[linear-gradient(270deg,rgb(22_27_29/0)_0%,rgb(22_27_29/0.4)_50%,rgb(22_27_29)_100%)] opacity-70 max-md:hidden';

const VIGNETTE =
  'absolute inset-0 bg-[radial-gradient(rgb(22_27_29/0)_0%,rgb(22_27_29/0.7)_100%)] max-md:hidden';

/**
 * The Up next card's link, under everything else on the card: the backdrop
 * and its shades, one picture layer (`PICTURE_LAYER`). The words and controls sit above it, so its name is the
 * card's `label`.
 */
export default function UpNextArt({
  backdrop,
  className,
  href,
  label,
  loading,
  onClick,
  onIntent,
}: Readonly<{
  backdrop?: string;
  /** A tone on the picture (the borrowed pick is dimmed) */
  className?: string;
  href: string;
  label: string;
  loading?: 'eager' | 'lazy';
  onClick?: MouseEventHandler<HTMLAnchorElement>;
  onIntent?: () => void;
}>) {
  const backdropClass = cn(
    'object-cover object-[62%_top] md:object-top',
    className,
  );
  return (
    <TileLink
      aria-label={label}
      backdrop={backdrop}
      className="absolute inset-0 rounded-12 focus-visible:-outline-offset-2"
      href={href}
      onClick={onClick}
      onIntent={onIntent}
    >
      {/* the backdrop and its shades: one layer, clipped once by the
          card's corners */}
      <span aria-hidden="true" className={PICTURE_LAYER}>
        {backdrop ? (
          <Image
            alt=""
            className={backdropClass}
            fill
            loading={loading}
            sizes="(min-width: 1024px) 852px, 100vw"
            src={backdrop}
          />
        ) : null}
        <span className={PHONE_SHADE} />
        <span className={SIDE_SHADE} />
        <span className={VIGNETTE} />
      </span>
    </TileLink>
  );
}
