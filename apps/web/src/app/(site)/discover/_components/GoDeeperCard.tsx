import type { GoDeeperCardView } from '@/app/(site)/_discover/data/goDeeper';
import ButtonContent from '@/components/ui/button/ButtonContent';
import {
  BUTTON_ICON_SIZE,
  buttonStyles,
} from '@/components/ui/button/buttonStyles';
import {
  arrowRightGlyph,
  calendarGlyph,
  seasonGlyph,
  tagGlyph,
  userGlyph,
  variantBuildingGlyph,
} from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import MetaItem from '@/components/ui/meta/MetaItem';
import MetaRow from '@/components/ui/meta/MetaRow';
import { HUB_TILE_SHADOW } from '@/components/ui/row/rowLayout';
import PosterTile from '@/components/ui/tile/PosterTile';
import TileLink from '@/components/ui/tile/TileLink';
import {
  PERSON_PREFETCH,
  TILE_PREFETCH,
} from '@/components/ui/tile/tilePrefetch';
import WatchedOverlay from '@/components/ui/tile/WatchedOverlay';
import cn from '@/lib/cn';
import { pluralCapped } from '@/lib/format/text';
import { formatCappedCount } from '@/lib/formatCount';
import landingPath from '@/lib/routing/landingPath';
import personPath from '@/lib/routing/personPath';

const KIND = {
  creator: { glyph: userGlyph, label: 'Creator' },
  network: { glyph: variantBuildingGlyph, label: 'Network' },
  theme: { glyph: tagGlyph, label: 'Theme' },
} as const;

const POSTER_SIZES = '(min-width: 768px) 170px, 30vw';

const POSTER_GRID = cn(
  'grid grid-cols-3 gap-2.5 [--tile-radius:8px] xl:grid-cols-4 xl:gap-5 xl:[--tile-radius:10px]',
  HUB_TILE_SHADOW,
);

/** The phone's button: `ButtonLink` at `sm`, drawn on a `TileLink` */
const PHONE_BUTTON = buttonStyles({
  className: 'gap-1.5 self-start px-4 xl:hidden',
  size: 'sm',
});

const goDeeperHref = (card: GoDeeperCardView): string =>
  card.kind === 'creator'
    ? personPath(card.to.id, card.to.slug)
    : landingPath(card.kind, card.to.slug);

/**
 * One rabbit hole: on desktop the left half is the
 * link (why, the trending show it starts from, the line, then the thread to
 * where it leads, and a 36px arrow), then three posters and "All N". Phones
 * stack it: from and to side by side, the posters, a
 * 36px "Dystopia · 146 shows" button. The desktop layout needs a card of
 * about 900px (its posters 117px from 1280); below 1280 the card is the
 * phone's stack at 560px (`ROW_TILES.card`), its posters about 170px.
 */
export default function GoDeeperCard({
  card,
}: Readonly<{ card: GoDeeperCardView }>) {
  const href = goDeeperHref(card);
  // a creator card goes to a person page: those prefetch on intent
  const prefetchOn = card.kind === 'creator' ? PERSON_PREFETCH : TILE_PREFETCH;
  const kind = KIND[card.kind];
  const count = pluralCapped(card.total, 'series', 'series');
  const label = `From ${card.from.title} to ${card.to.name}`;
  const openLabel = `Open ${card.to.name}: ${count}`;
  const total = `All ${formatCappedCount(card.total)}`;
  const button = `${card.to.name} · ${count}`;
  const kicker = `No. ${card.from.rank} this week`;
  const posters = card.items.slice(0, 3).map((show) => (
    <PosterTile
      id={show.id}
      key={show.id}
      overlay={<WatchedOverlay id={show.id} />}
      poster={show.poster}
      sizes={POSTER_SIZES}
      slug={show.slug}
      title={show.title}
    >
      <div className="flex min-w-0 flex-col gap-2 max-xl:hidden">
        <span className="truncate text-body-sm font-semibold">
          {show.title}
        </span>
        <MetaRow className="gap-3 text-caption">
          <MetaItem icon={calendarGlyph} iconSize={12}>
            {show.year ?? ''}
          </MetaItem>
        </MetaRow>
      </div>
    </PosterTile>
  ));
  return (
    <article
      aria-label={label}
      className="flex flex-col gap-3.5 rounded-16 bg-black/22 p-4 xl:grid xl:grid-cols-[290px_minmax(0,1fr)] xl:gap-8 xl:p-6"
    >
      {/* phones and tablets: from → to, side by side */}
      <div className="flex items-end justify-between gap-3 xl:hidden">
        <div className="flex min-w-0 flex-col gap-1.5">
          <small className="text-caption text-white/60">{kicker}</small>
          <b className="truncate text-title-3">{card.from.title}</b>
        </div>
        <div className="flex min-w-0 flex-col gap-1.5 border-l-2 border-white/10 pl-3">
          <small className="text-caption text-white/60">{kind.label}</small>
          <b className="truncate text-body font-semibold">{card.to.name}</b>
        </div>
      </div>
      {/* desktop: the left half is the link */}
      <TileLink
        aria-label={openLabel}
        className="group/rh relative -m-3 flex flex-col gap-6 rounded-12 p-4 pb-16 transition-colors hover:bg-white/5 max-xl:hidden"
        href={href}
        prefetchOn={prefetchOn}
      >
        <span className="flex flex-col gap-3">
          <small className="text-meta text-white/60">{kicker}</small>
          <b className="text-title-3">{card.from.title}</b>
          <span className="text-body-sm text-white/60">{card.why}</span>
        </span>
        <span className="flex flex-col gap-3 border-l-2 border-white/10 pl-4">
          <MetaRow className="gap-3 text-caption">
            <MetaItem icon={kind.glyph} iconSize={12}>
              {kind.label}
            </MetaItem>
          </MetaRow>
          <span className="text-title-3">{card.to.name}</span>
          <MetaRow className="gap-3 text-caption">
            <MetaItem icon={seasonGlyph} iconSize={12}>
              {count}
            </MetaItem>
          </MetaRow>
        </span>
        <span
          aria-hidden
          className="absolute right-4 bottom-4 flex size-9 items-center justify-center rounded-full border-2 border-white/20 text-white/80 group-hover/rh:border-white/50 group-hover/rh:text-white"
        >
          <Icon glyph={arrowRightGlyph} size={16} />
        </span>
      </TileLink>
      <div className={POSTER_GRID}>
        {posters}
        <TileLink
          className="flex aspect-2/3 flex-col items-center justify-center gap-2.5 rounded-10 p-4 text-center text-meta text-white shadow-[inset_0_0_0_1px_rgb(255_255_255/0.1)] transition-[color,box-shadow] hover:text-white hover:shadow-[inset_0_0_0_1px_rgb(255_255_255/0.3)] max-xl:hidden"
          href={href}
          prefetchOn={prefetchOn}
        >
          <Icon glyph={arrowRightGlyph} size={18} />
          <span>{total}</span>
        </TileLink>
      </div>
      {/* Phones: name, dot and count are separate items, 6px apart */}
      <TileLink
        aria-label={button}
        className={PHONE_BUTTON}
        href={href}
        prefetchOn={prefetchOn}
      >
        <ButtonContent icon={arrowRightGlyph} iconSize={BUTTON_ICON_SIZE.sm}>
          <span>{card.to.name}</span>
          <span aria-hidden>·</span>
          <span>{count}</span>
        </ButtonContent>
      </TileLink>
    </article>
  );
}
