import type { ReactNode } from 'react';

import PosterArt from './PosterArt';
import TileLink from './TileLink';

/** How a place draws its poster link: the link's hover and focus ring */
export type PosterLinkLook = Readonly<{ link: string }>;

type Props = Readonly<{
  /** the poster's alt, the title by default */
  alt?: string;
  href: string;
  /** replaces the link's accessible name (the poster's alt and the overlay's text) */
  label?: string;
  loading?: 'eager' | 'lazy';
  look: PosterLinkLook;
  overlay?: ReactNode;
  poster: string | null | undefined;
  sizes: string;
  title: string;
}>;

/**
 * A show's poster linking to its page, as one place draws the link
 * (`look`): the tile's own (`PosterTile`), and the places that put their
 * poster in a frame of their own (Stats' Popular unwatched, the profile's
 * Recently watched). Only the drawing.
 */
export default function PosterLink({
  alt,
  href,
  label,
  loading,
  look,
  overlay,
  poster,
  sizes,
  title,
}: Props) {
  return (
    <TileLink aria-label={label} className={look.link} href={href}>
      <PosterArt
        alt={alt}
        loading={loading}
        overlay={overlay}
        poster={poster}
        sizes={sizes}
        title={title}
      />
    </TileLink>
  );
}
