import Image from 'next/image';

import { clockGlyph, seasonGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import type { Glyph } from '@/components/ui/icon/types';
import MetaItem from '@/components/ui/meta/MetaItem';
import MetaRow from '@/components/ui/meta/MetaRow';
import NetworkWordmark from '@/components/ui/network/NetworkWordmark';
import { PICTURE_LAYER } from '@/components/ui/picture/pictureSurface';
import cn from '@/lib/cn';

import type { LensTileView } from '../../_data/lensModel';
import LensDeck from './LensDeck';

/** The fade from the foot, under the name */
const FADE =
  'absolute inset-0 bg-linear-to-t from-[rgb(18_22_23/0.9)] to-transparent to-65% md:to-60%';

const LINE_GLYPH = { clock: clockGlyph, layers: seasonGlyph } as const;

const SIZES = {
  big: '(min-width: 768px) 592px, calc(100vw - 32px)',
  small: '(min-width: 768px) 296px, calc(50vw - 21px)',
} as const;

/** The wordmark's tallest box (the big tile's, 30px) at 2× */
const WORDMARK_HEIGHT_2X = 60;

/**
 * A network's wordmark in the name's place: white, a little taller than the
 * name's capitals (`1.3cap` of the name's own size, on every breakpoint: at
 * cap height a stacked logo was too small to read), its bottom
 * on the name's baseline, as wide as its ratio allows within the tile
 */
function TileWordmark({
  first,
  loading,
  name,
  wordmark,
}: Readonly<{
  first: boolean;
  loading: 'eager' | 'lazy';
  name: string;
  wordmark: NonNullable<LensTileView['wordmark']>;
}>) {
  const height = WORDMARK_HEIGHT_2X;
  const width = Math.round(height * wordmark.ratio);
  // the box at 1×: 30px tall on the big tile, 23 on the others (desktop)
  const sizes = `${Math.round((first ? 30 : 23) * wordmark.ratio)}px`;
  return (
    <NetworkWordmark
      alt={name}
      className="inline-block h-[1.3cap] w-auto max-w-full align-baseline [--chip-pad:2px]"
      height={height}
      loading={loading}
      silhouette={wordmark.silhouette}
      sizes={sizes}
      src={wordmark.src}
      width={width}
    />
  );
}

/**
 * What a lens tile shows: its backdrop dimmed under a
 * dark fade, a fanned deck of three posters, or a calm icon; the name and
 * one meta line at the bottom (a network's white wordmark in the name's
 * place where it has one); a 1px ring that turns 2px white on hover and
 * on the open tile. Hover lifts the dimming and grows the picture 2%
 * (opacity and transform only).
 */
export default function LensTileBody({
  calmGlyph,
  first,
  loading,
  tile,
}: Readonly<{
  calmGlyph: Glyph;
  first: boolean;
  loading: 'eager' | 'lazy';
  tile: LensTileView;
}>) {
  const { look } = tile;
  const sizes = first ? SIZES.big : SIZES.small;
  const position =
    look.kind === 'backdrop' ? { objectPosition: look.position } : undefined;
  const nameClass = cn(
    'text-body font-semibold md:text-title-2',
    first && 'text-title-2 md:text-title-1',
  );
  const captionClass = cn(
    'absolute right-3 bottom-2.5 left-3 flex flex-col gap-1 md:right-5.5 md:bottom-5 md:left-5.5 md:gap-2.5',
    first && 'md:bottom-7.5 md:left-8 md:gap-3.5',
  );
  return (
    <>
      {look.kind === 'backdrop' && look.image ? (
        // the backdrop, its veil and the fade: one layer, clipped once by
        // the tile's corners
        <span aria-hidden className={PICTURE_LAYER}>
          <Image
            alt=""
            className="object-cover saturate-80 transition-[scale,filter] duration-[600ms,400ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] group-hover/tile:scale-102 group-hover/tile:saturate-95"
            fill
            loading={loading}
            sizes={sizes}
            src={look.image}
            style={position}
          />
          {/* brightness .55 → .8 on hover, as a fading veil; saturate .8 → .95 and the zoom are the image's own (filter .4s, zoom .6s; Tailwind's `scale-*` sets `scale`, not `transform`) */}
          <span className="absolute inset-0 bg-black/45 transition-opacity duration-400 group-hover/tile:opacity-44" />
          <span className={FADE} />
        </span>
      ) : (
        <>
          {look.kind === 'deck' ? (
            <LensDeck first={first} loading={loading} posters={look.posters} />
          ) : null}
          {look.kind === 'calm' ? (
            <Icon
              className="absolute top-5.5 left-5.5 text-white/60 max-md:hidden"
              glyph={calmGlyph}
              size={22}
              // 22px at stroke 2
              strokeWidth={2}
            />
          ) : null}
          <span aria-hidden className={FADE} />
        </>
      )}
      <span className={captionClass}>
        <span className={nameClass}>
          {tile.wordmark ? (
            <TileWordmark
              first={first}
              loading={loading}
              name={tile.name}
              wordmark={tile.wordmark}
            />
          ) : (
            tile.name
          )}
        </span>
        <MetaRow className="gap-3 text-caption max-md:[&_svg]:hidden">
          <MetaItem icon={LINE_GLYPH[tile.lineGlyph]} iconSize={12} shrink>
            {tile.line}
          </MetaItem>
        </MetaRow>
      </span>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-image-rim group-hover/tile:shadow-[inset_0_0_0_2px_rgb(255_255_255/0.5)] group-aria-expanded/tile:shadow-[inset_0_0_0_2px_#fff]"
        data-hairline
      />
    </>
  );
}
