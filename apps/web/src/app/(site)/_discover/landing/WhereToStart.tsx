import { hasEnoughPosters } from '@tvseri.es/constants';
import { formatRuntime } from '@tvseri.es/utils';
import {
  calendarGlyph,
  clockGlyph,
  seasonGlyph,
  variantTvGlyph,
} from '@/components/ui/icon/glyphs';
import MetaItem from '@/components/ui/meta/MetaItem';
import MetaRow from '@/components/ui/meta/MetaRow';
import { PAGE_COLUMN } from '@/components/ui/page/pageColumn';
import PosterArt from '@/components/ui/tile/PosterArt';
import TileLink from '@/components/ui/tile/TileLink';
import WatchedOverlay from '@/components/ui/tile/WatchedOverlay';
import showPath from '@/lib/routing/showPath';
import type { StartPick } from '../data/whereToStart';
import { StartSeenNote } from './WhereToStartMarks';

/** The kicker per pick */
const KICKER: Readonly<Record<StartPick['kind'], string>> = {
  favourite: 'Everyone’s favourite',
  'long-haul': 'The long haul',
  night: 'A night',
  weekend: 'A weekend',
};

const SIZES = '(min-width: 768px) 96px, 72px';

type Kickers = Readonly<Partial<Record<StartPick['kind'], string>>>;

type Props = Readonly<{
  /** unique on the page; the heading's id derives from it */
  id: string;
  /** a kind's own kicker where a landing words it differently (country: "One weekend") */
  kickers?: Kickers;
  picks: ReadonlyArray<StartPick>;
  /**
   * The middle meta item: episodes (genre, theme) or the network (country,
   * the phone's country card). Phones drop episodes.
   */
  second?: 'episodes' | 'network';
}>;

/**
 * "Where to start" (genre, theme, country): up to three cards, each
 * a kicker, the poster, the title, a meta line and the reason. Three columns
 * on desktop, stacked on a phone. Nothing under `MIN_POSTERS` picks: the
 * section steps aside, and the rows below keep those shows
 * (`neverRepeat` leaves out the same block).
 */
export default function WhereToStart({
  id,
  kickers,
  picks,
  second = 'episodes',
}: Props) {
  if (!hasEnoughPosters(picks.length)) {
    return null;
  }
  const titleId = `${id}-title`;
  const ids = picks.map((pick) => pick.id);
  return (
    <section
      aria-labelledby={titleId}
      className={PAGE_COLUMN}
      data-slot="start"
    >
      <div className="mb-6 flex items-center gap-2.5 md:gap-5">
        <h2 className="text-title-2 text-white" id={titleId}>
          Where to start
        </h2>
        <StartSeenNote ids={ids} />
      </div>
      <ul className="flex flex-col gap-3 md:gap-6 lg:grid lg:grid-cols-3">
        {picks.map((pick) => (
          <li key={pick.id}>
            <StartCard
              kicker={kickerOf(pick, kickers)}
              pick={pick}
              second={second}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

const kickerOf = (pick: StartPick, kickers: Kickers | undefined) =>
  kickers?.[pick.kind] ?? KICKER[pick.kind];

function StartCard({
  kicker,
  pick,
  second,
}: Readonly<{
  kicker: string;
  pick: StartPick;
  second: 'episodes' | 'network';
}>) {
  const label = `${kicker}: ${pick.title}`;
  const href = showPath(pick.id, pick.slug);
  const episodes =
    pick.episodes > 0
      ? `${pick.episodes} episode${pick.episodes === 1 ? '' : 's'}`
      : null;
  // The phone's country card: year and network only (the length is desktop's)
  const lengthClass = second === 'network' ? 'max-md:hidden' : undefined;
  return (
    <TileLink
      aria-label={label}
      className="grid h-full grid-cols-[72px_minmax(0,1fr)] items-start gap-4 rounded-16 bg-white/4 p-4 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.06)] transition-colors duration-200 hover:bg-white/7 md:grid-cols-[96px_minmax(0,1fr)] md:gap-6 md:p-6"
      href={href}
    >
      <span className="block [--tile-radius:8px]">
        <PosterArt
          // near the top of a landing: often the LCP image
          loading="eager"
          overlay={<WatchedOverlay id={pick.id} />}
          poster={pick.poster}
          sizes={SIZES}
          title={pick.title}
        />
      </span>
      <span className="flex min-w-0 flex-col" data-slot="start-text">
        <span className="text-overline text-white/60 uppercase">{kicker}</span>
        <span className="mt-2 truncate text-title-3 text-white">
          {pick.title}
        </span>
        {/* three across from lg: a fact that doesn't fit drops whole */}
        <MetaRow className="mt-2" fit="drop">
          <MetaItem icon={calendarGlyph}>{pick.year ?? undefined}</MetaItem>
          {second === 'network' ? (
            <MetaItem icon={variantTvGlyph} shrink>
              {pick.network ?? undefined}
            </MetaItem>
          ) : (
            <MetaItem className="max-md:hidden" icon={seasonGlyph}>
              {episodes ?? undefined}
            </MetaItem>
          )}
          <MetaItem className={lengthClass} icon={clockGlyph}>
            {formatRuntime(pick.totalMinutes) ?? undefined}
          </MetaItem>
        </MetaRow>
        <span className="mt-3 text-body-sm text-white/80">{pick.why}</span>
      </span>
    </TileLink>
  );
}
