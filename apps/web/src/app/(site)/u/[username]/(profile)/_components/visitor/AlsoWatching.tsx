import type { LibraryIds, UpNextItem } from '@tvseri.es/schemas';
import CodeBadge from '@/components/ui/button/CodeBadge';
import { FLAT, Ghost, TextLine } from '@/components/ui/ghost/ghosts';
import { pauseCircleGlyph } from '@/components/ui/icon/glyphs';
import MetaRow from '@/components/ui/meta/MetaRow';
import { isNewToViewer } from '@/lib/marking/librarySets';
import { libraryPath } from '@/lib/routing/profilePath';
import { loadViewerLibrary } from '../../_data/library';
import { loadOverview } from '../../_data/overview';
import type { Profile } from '../../_data/profile';
import EmptyState from '../blocks/EmptyState';
import HeadLink from '../blocks/HeadLink';
import Lane from '../blocks/Lane';
import LaneGhost, {
  GhostRows,
  LANE_ROW_GHOST,
  LinkGhost,
} from '../blocks/LaneGhost';
import { LANE_CAPS } from '../blocks/laneCaps';
import AlsoRow from './AlsoRow';
import { loadMatch } from './loadMatch';

/**
 * Their other shows in progress: not the Watching now one, not the shared
 * ones. Shared means the match's shared shows and anything you are watching
 * yourself (the match lists a sample of the shared shows, so it can miss one)
 */
function alsoWatching(
  upNext: ReadonlyArray<UpNextItem>,
  sharedIds: ReadonlySet<number>,
  library: LibraryIds | null,
): ReadonlyArray<UpNextItem> {
  return upNext
    .slice(1)
    .filter(
      (item) =>
        !sharedIds.has(item.seriesId) &&
        !library?.inProgress.includes(item.seriesId),
    );
}

/**
 * Also watching: what else they have going, with a green tag on
 * the shows that are in none of your lists and a + to save one.
 */
export default async function AlsoWatching({
  profile,
}: Readonly<{ profile: Profile }>) {
  const [overview, { match }, library] = await Promise.all([
    loadOverview(profile),
    loadMatch(profile),
    loadViewerLibrary(profile),
  ]);
  const shared = new Set(match.sharedShows.map((show) => show.id));
  const items = alsoWatching(overview.upNext, shared, library);
  const now = Date.now();
  const watchingHref = libraryPath(profile.user.username, 'watching');
  // No dead ends: the link only when their Watching shelf has shows
  const link =
    overview.upNext.length === 0 ? null : (
      <HeadLink href={watchingHref}>All in progress</HeadLink>
    );
  if (items.length === 0) {
    const emptySub = `Nothing else ${profile.user.username} has going.`;
    return (
      <Lane dot="cyan" hollow id="b-also" link={link} title="Also watching">
        <EmptyState
          glyph={pauseCircleGlyph}
          sub={emptySub}
          title="Nothing else in progress"
        />
      </Lane>
    );
  }
  return (
    <Lane
      count={items.length}
      dot="cyan"
      id="b-also"
      link={link}
      title="Also watching"
    >
      <ul
        className="m-0 flex list-none flex-col gap-2.5 p-0"
        data-equal-rows=""
      >
        {items.slice(0, LANE_CAPS.alsoWatching).map((item) => {
          const canAdd = !library?.watched.includes(item.seriesId);
          const isNew = isNewTo(library, item.seriesId);
          return (
            <AlsoRow
              canAdd={canAdd}
              isNew={isNew}
              item={item}
              key={item.seriesId}
              now={now}
            />
          );
        })}
      </ul>
    </Lane>
  );
}

const isNewTo = (library: LibraryIds | null, id: number) =>
  library ? isNewToViewer(library, id) : false;

function AlsoRowGhost() {
  return (
    <div className={LANE_ROW_GHOST}>
      <Ghost className="h-[60px] w-10 shrink-0 rounded-[5px]" />
      <span className="flex min-w-0 flex-1 flex-col gap-2">
        <TextLine className="text-body-sm" width="w-28" />
        <MetaRow className="h-[22px] gap-2.5" fit="drop">
          <CodeBadge className={FLAT} size="meta" />
          <TextLine className="text-meta" width="w-14" />
        </MetaRow>
      </span>
    </div>
  );
}

/** Also watching's placeholder: the lane with its two rows */
export function AlsoWatchingSkeleton() {
  const link = <LinkGhost width="w-24" />;
  return (
    <LaneGhost link={link} title="Also watching">
      <GhostRows
        className="flex flex-col gap-2.5"
        count={LANE_CAPS.alsoWatching}
      >
        <AlsoRowGhost />
      </GhostRows>
    </LaneGhost>
  );
}
