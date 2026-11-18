import Image from 'next/image';
import Link from 'next/link';
import SliceAccordion, {
  type AccordionSlice,
} from '@/components/ui/accordion/SliceAccordion';
import SliceAccordionGhost from '@/components/ui/accordion/SliceAccordionGhost';
import { showSlice } from '@/components/ui/accordion/showSlice';
import { Ghost, PULSE } from '@/components/ui/ghost/ghosts';
import {
  chevronRightGlyph,
  clockGlyph,
  completeGlyph,
} from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import MetaItem from '@/components/ui/meta/MetaItem';
import MetaRow from '@/components/ui/meta/MetaRow';
import { PICTURE_LAYER } from '@/components/ui/picture/pictureSurface';
import SectionHead from '@/components/ui/section/SectionHead';
import CardRim from '@/components/ui/tile/CardRim';
import TileLink from '@/components/ui/tile/TileLink';
import TitleTreatment from '@/components/ui/title/TitleTreatment';
import cn from '@/lib/cn';
import { libraryPath } from '@/lib/routing/profilePath';
import {
  getFinished,
  getSeriesArt,
  isUnavailable,
  type SeriesArt,
} from '@/lib/stats/loaders';
import StatsUnavailable from '../../../_components/StatsUnavailable';
import { FINISHED_TITLE } from '../firstlast/statsTitle';
import type { SectionProps } from '../types';
import {
  FINISHED_TILES,
  type FinishedTile,
  finishedFacts,
  finishedTile,
} from './model';

type Tile = Readonly<{ art: SeriesArt | null; tile: FinishedTile }>;

/**
 * A finished show as a slice of the profile's accordion (one component,
 * `SliceAccordion`): the backdrop, and while open the logo, its facts
 * (`finishedFacts`) and the viewer's Remote; no vertical title, as in the
 * profile's favourites
 */
function finishedSlice({ art, tile }: Tile): AccordionSlice {
  const facts = finishedFacts(tile);
  return {
    ...showSlice({
      backdrop: art?.backdropImage,
      facts,
      href: tile.href,
      loading: 'lazy',
      logo: art?.titleTreatmentImage,
      seriesId: tile.id,
      title: tile.title,
    }),
    id: tile.id,
  };
}

/** A card of the sideways strip (phone) */
function StripCard({ art, tile }: Readonly<Tile>) {
  const logo = art?.titleTreatmentImage ?? null;
  return (
    <TileLink
      aria-label={tile.title}
      className="relative block h-[172px] flex-none basis-[276px] overflow-hidden rounded-12 bg-ground-deep"
      href={tile.href}
    >
      {/* the backdrop and its fade: one layer, clipped once by the corners */}
      <span aria-hidden className={PICTURE_LAYER}>
        {art?.backdropImage ? (
          <Image
            alt=""
            className="object-cover brightness-75"
            fill
            loading="lazy"
            sizes="276px"
            src={art.backdropImage}
          />
        ) : null}
        <span className="absolute inset-0 bg-[linear-gradient(0deg,rgba(15,20,20,0.92)_0%,rgba(15,20,20,0.2)_70%)]" />
      </span>
      <span className="absolute inset-x-4 bottom-4 flex flex-col gap-3">
        <TitleTreatment look={FINISHED_TITLE} src={logo} title={tile.title} />
        <MetaRow className="gap-3">
          <MetaItem icon={completeGlyph}>{tile.finished}</MetaItem>
          {tile.duration ? (
            <MetaItem icon={clockGlyph}>{tile.duration}</MetaItem>
          ) : null}
        </MetaRow>
      </span>
      <CardRim />
    </TileLink>
  );
}

/**
 * "Finished in 2025": the shows that reached Finished in the year, newest
 * first, in the profile's favourites accordion (one open, hover opens
 * another; stacked rows below xl); on a phone a sideways strip. The count
 * links to the profile's Finished page (signed-in viewers; signed out it is
 * the 401 page with Login, as every profile page).
 */
export default async function Finished({ user, year }: SectionProps) {
  const finished = await getFinished(user.id, year);
  const title = `Finished in ${year}`;
  if (isUnavailable(finished)) {
    return (
      <StatsUnavailable placeholder={<FinishedSkeleton />} title={title} />
    );
  }
  const shows = finished.shows.slice(0, FINISHED_TILES);
  if (shows.length === 0) {
    return null;
  }
  const arts = await Promise.all(shows.map((show) => getSeriesArt(show.id)));
  const tiles = shows.map((show, index): Tile => {
    const art = arts[index];
    return {
      art: art && !isUnavailable(art) ? art : null,
      tile: finishedTile(show, year),
    };
  });
  const slices = tiles.map(finishedSlice);
  const finishedHref = libraryPath(user.username, 'finished');
  const count = (
    <Link
      className="flex items-center gap-1 whitespace-nowrap font-medium text-body-sm text-white/60 tabular-nums"
      href={finishedHref}
    >
      {finished.count}
      <Icon glyph={chevronRightGlyph} size={14} />
    </Link>
  );
  return (
    <section
      aria-labelledby="finished-title"
      className="flex min-w-0 flex-col gap-6"
    >
      <SectionHead id="finished-title" link={count} title={title} />
      <div className="max-md:hidden">
        <SliceAccordion slices={slices} />
      </div>
      <div className="-mx-gutter flex gap-2.5 overflow-x-auto px-gutter pb-1 [scrollbar-width:none] md:hidden">
        {tiles.map(({ art, tile }) => (
          <StripCard art={art} key={tile.id} tile={tile} />
        ))}
      </div>
    </section>
  );
}

/**
 * The accordion's box for six slices (`SliceAccordion`): 340px at xl, the
 * stacked rows below it (one open 220px row, five 56px rows, 8px apart); on
 * a phone the 172px cards and their 4px of padding
 */
const STRIP = [0, 1, 2, 3];
const STRIP_GHOST = cn(
  '-mx-gutter flex gap-2.5 overflow-hidden px-gutter pb-1 md:hidden',
  PULSE,
);

export function FinishedSkeleton() {
  return (
    <section
      aria-busy
      aria-label="Finished"
      className="flex min-w-0 flex-col gap-6"
    >
      <SectionHead id="finished-skeleton" title="Finished" />
      <div className="max-md:hidden">
        <SliceAccordionGhost slices={FINISHED_TILES} />
      </div>
      <div className={STRIP_GHOST}>
        {STRIP.map((n) => (
          <Ghost
            className="h-[172px] flex-none basis-[276px] rounded-12"
            key={n}
          />
        ))}
      </div>
    </section>
  );
}
