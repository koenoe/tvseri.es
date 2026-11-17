import { type ReactNode, ViewTransition } from 'react';
import DataDownView from '@/components/ui/error/DataDownView';
import GuardedSection from '@/components/ui/row/GuardedSection';
import { getStatsClock } from '../_data/clock';
import type { StatsUser } from '../_data/loaders';
import { getSummary, isUnavailable } from '../_data/loaders';
import EmptyYear from './EmptyYear';
import Tiles, { TilesSkeleton } from './header/Tiles';
import YearGlance from './header/YearGlance';
import YearHeader, { YearHeaderSkeleton } from './header/YearHeader';
import { STATS_ROWS, type StatsBlock } from './sections';
import type { SectionProps } from './types';

/**
 * The year's column (the layout draws the sidebar or the phone head beside
 * or above it). A phone leaves out "New, or back for more" and the map. A
 * year without episodes keeps the header and tiles and says so.
 */

export default async function StatsBody({
  user,
  year,
}: Readonly<{ user: StatsUser | null; year: number }>) {
  if (!user) {
    // The user lookup was unavailable: nothing of the page can be drawn, so
    // the page-level failure the show and person pages use (data
    // down, Try again refreshes), not a block that says "the rest of the
    // page is fine" over an empty page. The layout's grid steps aside for it
    // (`data-stats-down`), so it has the page's whole width.
    return (
      <div className="contents" data-stats-down="">
        <DataDownView />
      </div>
    );
  }
  const [{ state }, summary] = await Promise.all([
    getStatsClock(year),
    getSummary(user.id, year),
  ]);
  const isEmpty = !isUnavailable(summary) && summary.current.episodeCount === 0;
  // A finished year with episodes has a share card
  const props: SectionProps = {
    shareable: state === 'finished' && !isEmpty,
    state,
    user,
    year,
  };
  const glanceLabel = `${year} at a glance`;
  const yearTitle = String(year);
  return (
    <Column>
      <ViewTransition name="stats-glance">
        <YearGlance label={glanceLabel} year={year}>
          <GuardedSection
            fallback={<YearHeaderSkeleton />}
            id="stats-header"
            title={yearTitle}
          >
            <YearHeader {...props} />
          </GuardedSection>
          <GuardedSection
            fallback={<TilesSkeleton />}
            id="stats-tiles"
            title="Totals"
          >
            <Tiles {...props} />
          </GuardedSection>
        </YearGlance>
      </ViewTransition>
      {isEmpty ? (
        <EmptyYear {...props} />
      ) : (
        STATS_ROWS.map((row) => (
          <StatsRow key={row[0]?.id} props={props} row={row} />
        ))
      )}
    </Column>
  );
}

/** One row of blocks: a full-width block, or two side by side on desktop */
function StatsRow({
  props,
  row,
}: Readonly<{ props: SectionProps | null; row: ReadonlyArray<StatsBlock> }>) {
  const blocks = row.map((item) => (
    <StatsBlockView item={item} key={item.id} props={props} />
  ));
  return row.length > 1 ? (
    <div className="grid gap-12 md:grid-cols-2 md:gap-5">{blocks}</div>
  ) : (
    blocks
  );
}

/**
 * One block: its content in its own Suspense, or (`props` null, the page's
 * loading shell) just its fallback, from the same list and the same frame.
 * The grid frame hands its box to the block unchanged; it carries the
 * block's name for the placeholder-parity checks.
 */
function StatsBlockView({
  item,
  props,
}: Readonly<{ item: StatsBlock; props: SectionProps | null }>) {
  const { Component } = item;
  const section = (
    <div
      className="grid min-w-0"
      data-placeholder={props ? undefined : item.id}
      data-slot={props ? item.id : undefined}
    >
      {props ? (
        <GuardedSection
          fallback={item.fallback}
          id={item.id}
          title={item.title(props)}
        >
          <Component {...props} />
        </GuardedSection>
      ) : (
        item.fallback
      )}
    </div>
  );
  return item.phoneHidden ? (
    <div className="hidden md:contents">{section}</div>
  ) : (
    section
  );
}

/** The column; `loading`: the skeleton's, named for the parity checks */
function Column({
  children,
  loading = false,
}: Readonly<{ children: ReactNode; loading?: boolean }>) {
  return (
    <div
      className="flex min-w-0 flex-col gap-12 md:gap-16"
      data-placeholder={loading ? 'stats' : undefined}
      data-slot={loading ? undefined : 'stats'}
    >
      {children}
    </div>
  );
}

export function StatsBodySkeleton() {
  return (
    <Column loading>
      <section className="flex flex-col md:gap-6">
        <YearHeaderSkeleton />
        <TilesSkeleton />
      </section>
      {STATS_ROWS.map((row) => (
        <StatsRow key={row[0]?.id} props={null} row={row} />
      ))}
    </Column>
  );
}
