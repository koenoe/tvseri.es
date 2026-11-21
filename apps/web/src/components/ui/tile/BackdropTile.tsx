import Image from 'next/image';
import type { ReactNode } from 'react';
import { PICTURE_LAYER } from '@/components/ui/picture/pictureSurface';
import { ROW_IMAGE_SIZES } from '@/components/ui/row/rowLayout';
import TileLink from '@/components/ui/tile/TileLink';
import TitleTreatment, {
  type TitleTreatmentLook,
} from '@/components/ui/title/TitleTreatment';
import showPath from '@/lib/routing/showPath';
import { TILE_HOVER_WIDE } from './tileHover';

/**
 * A backdrop link's frame without its size: radius 12, a 1px inner ring and
 * the one backdrop hover (`tileHover`: 3%); the picture and its fade are
 * `BackdropImage`. The 16:9 tile adds `aspect-video`; Home's New this week
 * lead is as tall as the posters beside it.
 */
export const BACKDROP_FRAME = `relative block w-full overflow-hidden rounded-12 bg-white/5 shadow-[0_10px_15px_-3px_rgb(0_0_0/0.1)] ${TILE_HOVER_WIDE} image-rim after:z-3 focus-visible:outline-offset-4`;

const LINK = `${BACKDROP_FRAME} aspect-video`;

/**
 * The dark fade from the bottom, under the logo or title: a pixel past the
 * frame, so the frame's edge cuts through it while the tile grows
 */
const FADE =
  'absolute -inset-px bg-linear-to-t from-black/72 to-transparent to-62%';

/**
 * The backdrop filling its frame under its fade, one picture layer
 * (`PICTURE_LAYER`) so the frame's corners clip them together; the fade
 * stays without a backdrop. Decorative: the logo or title names the show.
 */
export function BackdropImage({
  backdrop,
  loading,
  sizes,
}: Readonly<{
  backdrop: string | null | undefined;
  loading?: 'eager' | 'lazy';
  sizes: string;
}>) {
  return (
    <span aria-hidden="true" className={PICTURE_LAYER}>
      {backdrop ? (
        <Image
          alt=""
          className="object-cover"
          fill
          loading={loading}
          sizes={sizes}
          src={backdrop}
        />
      ) : null}
      <span className={FADE} />
    </span>
  );
}

type Props = Readonly<{
  /** TMDB backdrop URL */
  backdrop: string | null | undefined;
  /** under the tile: usually the meta line */
  children?: ReactNode;
  id: number | string;
  /** replaces the link's name (otherwise the logo's alt or the written title) */
  label?: string;
  loading?: 'eager' | 'lazy';
  /** TMDB title treatment; without one the title is written instead */
  logo?: string | null;
  sizes?: string;
  slug?: string | null;
  title: string;
}>;

/** The show's logo, up to 180 × 56 at the bottom left; else its title */
// Each place keeps its own look on purpose; don't unify them.
const BACKDROP_TITLE: TitleTreatmentLook = {
  height: 56,
  logo: 'h-auto max-h-14 w-auto max-w-45 object-contain object-left-bottom',
  sizes: '180px',
  text: 'text-body font-semibold text-white',
  width: 180,
};

/**
 * Home's 16:9 tile ("More Sci-Fi & Fantasy"): the backdrop under a dark
 * fade from the bottom, the show's logo (max 180 × 56) or its title at the
 * bottom left, a 1px inner ring, radius 12, and a 3% grow on hover. The line
 * below sits 12px under it (8 on phones), as under a poster.
 */
export default function BackdropTile({
  backdrop,
  children,
  id,
  label,
  loading,
  logo,
  sizes = ROW_IMAGE_SIZES.backdrop,
  slug,
  title,
}: Props) {
  const href = showPath(id, slug);
  return (
    <div className="flex flex-col gap-2 md:gap-3">
      <TileLink aria-label={label} className={LINK} data-hairline href={href}>
        <BackdropImage backdrop={backdrop} loading={loading} sizes={sizes} />
        <span className="absolute right-4.5 bottom-4 left-4.5 z-2 flex items-end">
          <TitleTreatment
            loading={loading}
            look={BACKDROP_TITLE}
            src={logo}
            title={title}
          />
        </span>
      </TileLink>
      {children}
    </div>
  );
}
