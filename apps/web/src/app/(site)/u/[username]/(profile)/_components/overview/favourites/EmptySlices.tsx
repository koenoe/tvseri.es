import type { SliceParts } from '@/components/ui/accordion/showSlice';
import {
  OPEN_HIDES_AT_ONCE,
  SLICE_TITLE,
  SliceBackdrop,
  SliceFacts,
  SliceFull,
  SliceRing,
  SliceShade,
  SliceTitle,
} from '@/components/ui/accordion/slice';
import { heartGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import TileLink from '@/components/ui/tile/TileLink';
import TitleTreatment from '@/components/ui/title/TitleTreatment';
import showPath from '@/lib/routing/showPath';
import AddToFavourites from './AddToFavourites';
import { suggestionFacts } from './favouriteFacts';
import type { Tile } from './loadFavourites';

/** The open slice of an empty Favourites: says what this is, quietly */
export function introSlice({
  text,
  withPicks,
}: Readonly<{ text: string; withPicks: boolean }>): SliceParts {
  // the closed slice's heart: gone at once when it opens (it would jump to
  // the open slice's centre), fading back in once it has closed
  const star = withPicks
    ? `absolute inset-0 flex items-center justify-center text-white/60 transition-opacity duration-300 ${OPEN_HIDES_AT_ONCE}`
    : 'hidden';
  return {
    backdrop: (
      <span className="absolute inset-0 bg-[linear-gradient(160deg,rgb(255_255_255/0.07)_0%,rgb(255_255_255/0.02)_100%)]" />
    ),
    content: (
      <>
        <span aria-hidden="true" className={star}>
          <Icon glyph={heartGlyph} size={20} />
        </span>
        {/* the open slice's size, fixed: a closing or opening slice clips
            the text instead of re-wrapping it, and it only fades */}
        <span className="absolute top-0 left-8 flex h-[220px] w-[calc(100%-4rem)] flex-col justify-center gap-2.5 transition-opacity duration-300 group-data-[open=false]/fv:opacity-0 xl:h-full xl:w-[300px]">
          <span
            aria-hidden="true"
            className="mb-1.5 flex size-11 items-center justify-center rounded-full bg-white/8 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.1)]"
          >
            <Icon glyph={heartGlyph} size={20} />
          </span>
          <span className="text-title-2">Nothing here yet</span>
          <span className="text-body-sm text-white/60">{text}</span>
        </span>
        <SliceRing />
      </>
    ),
  };
}

/** A finished show offered as a favourite: dimmed until opened, only the owner sees it */
export function suggestionSlice({
  eager,
  now,
  tile,
}: Readonly<{ eager: boolean; now: number; tile: Tile }>): SliceParts {
  const { facts, item, series } = tile;
  const href = showPath(item.id, item.slug);
  const backdrop = facts?.backdropImage || series?.backdropImage;
  const shown = facts ? suggestionFacts(facts, now) : [];
  return {
    backdrop: (
      <>
        <SliceBackdrop dim loading={eager ? 'eager' : 'lazy'} src={backdrop} />
        <SliceShade />
      </>
    ),
    content: (
      <>
        <SliceFull interactive>
          <TitleTreatment
            look={SLICE_TITLE}
            src={series?.titleTreatmentImage}
            title={item.title}
          />
          <SliceFacts facts={shown} />
          <AddToFavourites seriesId={item.id} />
        </SliceFull>
        <SliceTitle title={item.title} />
        <SliceRing dim />
        <TileLink
          aria-label={`Open ${item.title}`}
          className="absolute inset-0 z-2 rounded-12"
          href={href}
        />
      </>
    ),
  };
}
