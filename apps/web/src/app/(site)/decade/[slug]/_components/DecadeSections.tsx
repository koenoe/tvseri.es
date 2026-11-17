import { hasEnoughPosters } from '@tvseri.es/constants';
import { notFound } from 'next/navigation';
import type { CSSProperties } from 'react';
import { eyeGlyph } from '@/components/ui/icon/glyphs';
import type { Glyph } from '@/components/ui/icon/types';
import { PAGE_COLUMN } from '@/components/ui/page/pageColumn';
import GuardedSection from '@/components/ui/row/GuardedSection';
import { RowErrorCard } from '@/components/ui/row/RowError';
import {
  GHOST_FILL,
  GHOST_LOOK,
  GhostLine,
} from '@/components/ui/row/RowGhosts';
import RowSkeleton from '@/components/ui/row/RowSkeleton';
import { isUnavailable } from '@/lib/cache/unavailable';
import cn from '@/lib/cn';
import { loadSeriesStates } from '@/lib/marking/server/seriesStates';
import {
  END_LINE,
  LandingEndCard,
  LandingRow,
  LandingRowSlot,
  LandingSections,
  type PlaceholderLook,
} from '../../../_discover/landing';
import { LANDSCAPE_SIZE } from '../_data/landscape';
import { decadeOf, decadeRows, getLandscape } from '../_data/loaders';
import { layoutTreemap } from '../_data/treemap';
import DecadeLandscape from './DecadeLandscape';

type Props = Readonly<{ params: Promise<{ slug: string }> }>;

/** The subtitle's eye (the outline drawing of the toggle glyph) */
const EYE: Glyph = { outline: eyeGlyph.outline };

const LANDSCAPE = 'The decade by attention';

/**
 * A typical decade's votes, biggest first (the eleven most rated fall off
 * by about a third each): the loading map takes the treemap's own layout
 * from them, so its cells sit where a decade's tiles usually do.
 */
const TYPICAL_VOTES = [100, 62, 48, 40, 33, 28, 24, 20, 17, 15, 13];
const GHOST_CELLS = layoutTreemap(TYPICAL_VOTES);
const WIDE_PILL = cn('h-10 w-31 rounded-full', GHOST_FILL);
const NARROW_PILL = cn('h-10 w-27 rounded-full', GHOST_FILL);

/**
 * The landscape's place while it loads, built from the loaded parts: the
 * treemap's cells (`layoutTreemap`, a tile 4px inside each, its title and
 * votes line where the tile draws them), the selected show's card (kicker,
 * title, meta, reason, the two pills), and on a phone the eleven list rows
 * (rank, title, bar, votes). Dashed shapes when it failed.
 */
function DecadeLandscapeSkeleton({
  look = 'loading',
}: Readonly<{ look?: PlaceholderLook }>) {
  const loading = look === 'loading';
  const shape = loading ? GHOST_FILL : GHOST_LOOK.failed;
  const cellClass = cn('relative block size-full rounded-12', shape);
  const cardClass = cn(
    'mt-4 grid h-47 grid-cols-[minmax(0,1fr)_auto] items-center gap-8 rounded-16 px-8 py-6 max-md:hidden lg:h-41',
    shape,
  );
  const rankBarClass = cn('mt-2 block h-1 w-full rounded-2', shape);
  return (
    <div aria-hidden className={loading ? 'animate-ghost' : undefined}>
      <span className="relative mt-10 block h-140 max-md:hidden">
        {GHOST_CELLS.map((cell) => {
          const style: CSSProperties = {
            height: `${cell.height}%`,
            left: `${cell.left}%`,
            top: `${cell.top}%`,
            width: `${cell.width}%`,
          };
          return (
            <span
              className="absolute p-1"
              key={`${cell.left}-${cell.top}`}
              style={style}
            >
              <span className={cellClass}>
                {loading ? (
                  <span className="absolute right-4 bottom-3 left-4 flex flex-col">
                    <GhostLine
                      className="h-7"
                      inPulse
                      look="loading"
                      width="w-2/3"
                    />
                    {cell.votesLine ? (
                      <GhostLine
                        className="mt-1 h-5"
                        inPulse
                        look="loading"
                        width="w-1/3"
                      />
                    ) : null}
                  </span>
                ) : null}
              </span>
            </span>
          );
        })}
      </span>
      <span className={cardClass} data-placeholder="decade-card">
        {loading ? (
          <>
            <span className="flex min-w-0 flex-col items-start">
              <GhostLine className="h-5" inPulse look="loading" width="w-40" />
              <GhostLine
                className="mt-2 h-6"
                inPulse
                look="loading"
                width="w-48"
              />
              <GhostLine
                className="mt-2 h-5"
                inPulse
                look="loading"
                width="w-56"
              />
              <GhostLine
                className="mt-3 h-6"
                inPulse
                look="loading"
                width="w-96"
              />
            </span>
            <span className="flex items-center gap-3 pt-1">
              <span className={WIDE_PILL} />
              <span className={NARROW_PILL} />
            </span>
          </>
        ) : null}
      </span>
      <span className="-mx-2 mt-12 flex flex-col gap-0.5 md:hidden">
        {Array.from({ length: LANDSCAPE_SIZE }, (_, index) => (
          <span
            className="grid h-14 grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 rounded-12 px-2 py-2.5"
            key={index}
          >
            <GhostLine
              className="h-6"
              inPulse={loading}
              look={look}
              width="w-5 justify-self-end"
            />
            <span className="flex min-w-0 flex-col">
              <GhostLine
                className="h-6"
                inPulse={loading}
                look={look}
                width="w-3/5"
              />
              <span className={rankBarClass} />
            </span>
            <GhostLine
              className="h-5"
              inPulse={loading}
              look={look}
              width="w-10"
            />
          </span>
        ))}
      </span>
    </div>
  );
}

/** The landscape's place before the slug resolves (the page's shell) */
export function DecadeLandscapeFallback() {
  return (
    <div className={PAGE_COLUMN}>
      <DecadeLandscapeSkeleton />
    </div>
  );
}

/** The landscape when its data is `Unavailable`: the failed look and card */
function DecadeLandscapeUnavailable() {
  return (
    <section aria-label={LANDSCAPE} className={PAGE_COLUMN}>
      <div className="relative [--row-end:0px] [--row-start:0px]">
        <DecadeLandscapeSkeleton look="failed" />
        <RowErrorCard state="unavailable" title={LANDSCAPE} />
      </div>
    </section>
  );
}

/**
 * The treemap and its card, the ranked list on a phone, in the
 * prerendered shell; the failed look while the API can't answer.
 */
async function DecadeLandscapeBlock({ slug }: Readonly<{ slug: string }>) {
  const shows = await getLandscape(slug);
  if (isUnavailable(shows)) {
    return <DecadeLandscapeUnavailable />;
  }
  // a treemap of one or two shows is left out (3 or more)
  return hasEnoughPosters(shows.length) ? (
    <section aria-label={LANDSCAPE} className={PAGE_COLUMN}>
      <DecadeLandscape
        shows={shows}
        states={loadSeriesStates(shows.map((show) => show.id))}
      />
    </section>
  ) : null;
}

/** The landscape's section: its own error state and an exact-size skeleton */
export async function DecadeLandscapeSection({ params }: Props) {
  const { slug } = await params;
  if (!decadeOf(slug)) {
    notFound();
  }
  const skeleton = <DecadeLandscapeFallback />;
  return (
    <GuardedSection fallback={skeleton} id="landscape" title={LANDSCAPE}>
      <DecadeLandscapeBlock slug={slug} />
    </GuardedSection>
  );
}

/** The rows' place before the slug is known: Missed by most (a static title) and the end card */
export function DecadeSectionsSkeleton() {
  return (
    <LandingSections placeholder start="loose">
      <RowSkeleton id="missed" look="landing" title="Missed by most" />
      <LandingEndCard line={END_LINE.decade} title="" titleGhost />
    </LandingSections>
  );
}

/**
 * Below the landscape: Missed by most (home's row, never the treemap's
 * shows) and the end card, with only "Back to Discover".
 */
export async function DecadeSections({ params }: Props) {
  const { slug } = await params;
  const decade = decadeOf(slug);
  if (!decade) {
    notFound();
  }
  const rows = decadeRows(slug);
  return (
    <LandingSections start="loose">
      <LandingRowSlot id="missed" title="Missed by most">
        <LandingRow
          id="missed"
          index={1}
          loaders={rows}
          subtitle="Rated as well, seen by a fraction"
          subtitleGlyph={EYE}
          title="Missed by most"
        />
      </LandingRowSlot>
      <LandingEndCard
        line={END_LINE.decade}
        title={`That’s the ${decade.label}`}
      />
    </LandingSections>
  );
}
