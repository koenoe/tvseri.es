import { ghostCircle, PULSE } from '@/components/ui/ghost/ghosts';
import { playGlyph } from '@/components/ui/icon/glyphs';
import Dot from '@/components/ui/lane/Dot';
import SectionHead from '@/components/ui/section/SectionHead';
import SectionHeadGhost from '@/components/ui/section/SectionHeadGhost';
import { loadUpNextArt } from '@/components/up-next/loadUpNextArt';
import UpNextCardGhost from '@/components/up-next/UpNextCardGhost';
import { isNewToViewer } from '@/lib/marking/librarySets';
import { loadSeriesOrNull } from '@/lib/series/loaders';
import { loadViewerLibrary } from '../../_data/library';
import { loadOverview } from '../../_data/overview';
import type { Profile } from '../../_data/profile';
import EmptyState from '../blocks/EmptyState';
import LiveOwnerHero from './up-next/LiveOwnerHero';
import { type HeroPick, loadPicks } from './up-next/loadUpNext';
import PickHero from './up-next/PickHero';
import PickSwitcher from './up-next/PickSwitcher';
import PickUnavailable from './up-next/PickUnavailable';
import VisitorHero from './up-next/VisitorHero';

/** The owner's hero and the show that takes its place when it is caught up */
const OWNER_ITEMS = 2;

/**
 * Up next: the hero card of the one episode to watch next. A
 * visitor reads it as Watching now. With nothing in progress the
 * owner gets a dimmed pick, a visitor the calm empty line.
 */
export default async function UpNext({
  profile,
}: Readonly<{ profile: Profile }>) {
  const overview = await loadOverview(profile);
  const item = overview.upNext[0];
  const visitor = profile.viewer === 'visitor';
  const title = visitor ? 'Watching now' : 'Up next';

  if (!item) {
    const picks = visitor ? [] : await loadPicks(profile);
    return (
      <Frame hollow title={title}>
        <EmptyPick picks={picks} visitor={visitor} />
      </Frame>
    );
  }

  const now = Date.now();
  if (!visitor) {
    // The next show's art too: it takes the hero when the first is caught up
    const owned = overview.upNext.slice(0, OWNER_ITEMS);
    const art = await Promise.all(
      owned.map(({ seriesId }) => loadUpNextArt(seriesId)),
    );
    const empty = (
      <EmptyState
        glyph={playGlyph}
        sub="Start a series and it opens here."
        title="Nothing in progress"
      />
    );
    return (
      <Frame title={title}>
        <LiveOwnerHero art={art} empty={empty} items={owned} now={now} />
      </Frame>
    );
  }

  const [series, library] = await Promise.all([
    loadSeriesOrNull(item.seriesId),
    loadViewerLibrary(profile),
  ]);
  return (
    <Frame title={title}>
      <VisitorHero
        isNew={library ? isNewToViewer(library, item.seriesId) : false}
        item={item}
        now={now}
        series={series}
      />
    </Frame>
  );
}

function Frame({
  children,
  hollow,
  title,
}: Readonly<{
  children: React.ReactNode;
  hollow?: boolean;
  title: string;
}>) {
  return (
    <section aria-labelledby="up-next" className="flex flex-col gap-6">
      <SectionHead
        id="up-next"
        leading={<Dot hollow={hollow} tone="cyan" />}
        title={title}
      />
      {children}
    </section>
  );
}

function EmptyPick({
  picks,
  visitor,
}: Readonly<{
  /** null: the pick's source is down */
  picks: ReadonlyArray<HeroPick> | null;
  visitor: boolean;
}>) {
  if (picks === null) {
    return <PickUnavailable />;
  }
  const fallback = (
    <EmptyState
      glyph={playGlyph}
      sub={
        visitor
          ? 'Nothing in progress on their side right now.'
          : 'Start a series and it opens here.'
      }
      title="Nothing in progress"
    />
  );
  if (picks.length === 0) {
    return fallback;
  }
  const cards = picks.map((pick) => (
    <PickHero key={pick.seriesId} pick={pick} />
  ));
  return <PickSwitcher cards={cards} fallback={fallback} />;
}

/** The ⋯ (a visitor's +) */
const ACTION = <span className={ghostCircle()} />;

/**
 * Up next (or Watching now) while it streams: the real title and the shared
 * card's ghost, pulsing as one layer.
 */
export function UpNextSkeleton({ title }: Readonly<{ title: string }>) {
  return (
    <div aria-hidden="true" className="flex flex-col gap-6">
      <SectionHeadGhost alone title={title} />
      <div className={PULSE}>
        <UpNextCardGhost actions={ACTION} />
      </div>
    </div>
  );
}
