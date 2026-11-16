import Image from 'next/image';

import cn from '@/lib/cn';

type Props = Readonly<{
  /** the network's name when the logo stands in for it; '' when beside it */
  alt: string;
  /** its size and place (the logo is contained, bottom left) */
  className?: string;
  /** the intrinsic size: the box at 2×, at a typical logo's ratio */
  height: number;
  /** keep the logo's own colours (Netflix red); otherwise it is drawn white */
  keep?: boolean;
  loading?: 'eager' | 'lazy';
  /**
   * false when the logo doesn't read as a white silhouette (a filled block,
   * the API's `logoSilhouette`): drawn in its own colours on a light chip
   */
  silhouette?: boolean;
  sizes: string;
  src: string;
  width: number;
}>;

/**
 * The chip a logo that can't be whitened sits on: the place's height (its
 * `className`), as wide as the logo, white at 92% with a 6px radius and 4px
 * around the logo. A small place sets less in its `className`
 * (`[--chip-pad:2px]`; a variable, so the white drawing ignores it).
 */
const CHIP = 'flex rounded-6 bg-white/92 p-[var(--chip-pad,4px)]';
const CHIP_LOGO = 'block h-full w-auto max-w-full object-contain object-left';

/**
 * A network's TMDB logo (its wide wordmark), the one way it is drawn on a
 * picture or the page: white (any colour to a white silhouette), unless it
 * keeps its own colours, contained on its bottom left. A logo whose
 * silhouette would be a blank shape (`silhouette={false}`) is drawn in its
 * own colours on a light chip of the same height instead. The network
 * page's title, Discover's tiles and Essentials, the show's Information and
 * What's on's caption.
 */
export default function NetworkWordmark({
  alt,
  className,
  height,
  keep = false,
  loading,
  silhouette = true,
  sizes,
  src,
  width,
}: Props) {
  const image = (imageClassName: string) => (
    <Image
      alt={alt}
      className={imageClassName}
      height={height}
      loading={loading}
      sizes={sizes}
      src={src}
      width={width}
    />
  );
  if (!keep && !silhouette) {
    // the place's size on the chip, which hugs the logo (`w-fit` last)
    const chip = cn(CHIP, className, 'w-fit');
    return <span className={chip}>{image(CHIP_LOGO)}</span>;
  }
  return image(
    cn(
      'block object-contain object-left-bottom',
      !keep && 'brightness-0 invert',
      className,
    ),
  );
}
