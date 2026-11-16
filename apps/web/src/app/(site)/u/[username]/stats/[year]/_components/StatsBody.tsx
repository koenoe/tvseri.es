import { ViewTransition } from 'react';
import { BELOW_FLOATING_HEADER_LG } from '@/components/header/belowFloatingHeader';
import DataDownView from '@/components/ui/error/DataDownView';
import { getStatsClock } from '../_data/clock';
import type { StatsUser } from '../_data/loaders';
import { getSummary, isUnavailable } from '../_data/loaders';
import EmptyYear from './EmptyYear';
import Tiles, { TilesSkeleton } from './header/Tiles';
import YearGlance from './header/YearGlance';
import YearHeader, { YearHeaderSkeleton } from './header/YearHeader';
import StatsSection from './StatsSection';
import { STATS_ROWS, type StatsBlock } from './sections';
import PhoneHead, { PhoneHeadSkeleton } from './sidebar/PhoneHead';
import StatsSidebar, { StatsSidebarSkeleton } from './sidebar/StatsSidebar';
import type { SectionProps } from './types';

const SIDEBAR_CLASSES = `sticky top-8 hidden lg:flex lg:flex-col lg:gap-10 ${BELOW_FLOATING_HEADER_LG}`;

/**
 * The page under the site header: the sticky
 * 300px sidebar and the main column from `lg`; below it
 * a short identity header with the Years pills, then
 * the same column. A phone also leaves out "New, or back for more" and the
 * map. A year without episodes keeps the header and
 * tiles and says so.
 */

export default async function StatsBody({
  user,
  year,
}: Readonly<{ user: StatsUser | null; year: number }>) {
  if (!user) {
    // The user lookup was unavailable: nothing of the page can be drawn, so
    // the page-level failure the show and person pages use (data
    // down, Try again refreshes), not a block that says "the rest of the
    // page is fine" over an empty page
    return <DataDownView />;
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
    <Layout
      phoneHead={
        <StatsSection
          fallback={<PhoneHeadSkeleton />}
          id="stats-phone-head"
          title="Years"
        >
          <PhoneHead {...props} />
        </StatsSection>
      }
      sidebar={
        <StatsSection
          fallback={<StatsSidebarSkeleton />}
          id="stats-sidebar"
          title="Years"
        >
          <StatsSidebar {...props} />
        </StatsSection>
      }
    >
      <ViewTransition name="stats-glance">
        <YearGlance label={glanceLabel} year={year}>
          <StatsSection
            fallback={<YearHeaderSkeleton />}
            id="stats-header"
            title={yearTitle}
          >
            <YearHeader {...props} />
          </StatsSection>
          <StatsSection
            fallback={<TilesSkeleton />}
            id="stats-tiles"
            title="Totals"
          >
            <Tiles {...props} />
          </StatsSection>
        </YearGlance>
      </ViewTransition>
      {isEmpty ? (
        <EmptyYear {...props} />
      ) : (
        STATS_ROWS.map((row) => (
          <StatsRow key={row[0]?.id} props={props} row={row} />
        ))
      )}
    </Layout>
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
        <StatsSection
          fallback={item.fallback}
          id={item.id}
          title={item.title(props)}
        >
          <Component {...props} />
        </StatsSection>
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

function Layout({
  children,
  loading = false,
  phoneHead,
  sidebar,
}: Readonly<{
  children: React.ReactNode;
  /** The loading shell: the box's name for the placeholder-parity checks */
  loading?: boolean;
  phoneHead: React.ReactNode;
  sidebar: React.ReactNode;
}>) {
  return (
    <div
      className="mx-auto w-full max-w-page items-start px-gutter pt-6 lg:grid lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-16 lg:pt-[35px]"
      data-placeholder={loading ? 'stats' : undefined}
      data-slot={loading ? undefined : 'stats'}
    >
      <aside
        aria-label="About this profile"
        className={SIDEBAR_CLASSES}
        data-placeholder={loading ? 'stats-aside' : undefined}
        data-slot={loading ? undefined : 'stats-aside'}
      >
        {sidebar}
      </aside>
      <div
        className="lg:hidden"
        data-placeholder={loading ? 'stats-phone-head' : undefined}
        data-slot={loading ? undefined : 'stats-phone-head'}
      >
        {phoneHead}
      </div>
      <div className="flex min-w-0 flex-col gap-12 md:gap-16">{children}</div>
    </div>
  );
}

export function StatsBodySkeleton() {
  return (
    <Layout
      loading
      phoneHead={<PhoneHeadSkeleton />}
      sidebar={<StatsSidebarSkeleton />}
    >
      <section className="flex flex-col md:gap-6">
        <YearHeaderSkeleton />
        <TilesSkeleton />
      </section>
      {STATS_ROWS.map((row) => (
        <StatsRow key={row[0]?.id} props={null} row={row} />
      ))}
    </Layout>
  );
}
