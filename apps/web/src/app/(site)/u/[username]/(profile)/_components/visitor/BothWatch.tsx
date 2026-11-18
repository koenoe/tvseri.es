import type { SharedShow } from '@tvseri.es/schemas';
import { Ghost, TextLine } from '@/components/ui/ghost/ghosts';
import {
  calendarGlyph,
  completeGlyph,
  eyeGlyph,
  heartGlyph,
  seasonGlyph,
  tagGlyph,
  usersGlyph,
} from '@/components/ui/icon/glyphs';
import MetaItem from '@/components/ui/meta/MetaItem';
import MetaRow from '@/components/ui/meta/MetaRow';
import TileLink from '@/components/ui/tile/TileLink';
import cn from '@/lib/cn';
import { libraryPath } from '@/lib/routing/profilePath';
import showPath from '@/lib/routing/showPath';
import type { Profile } from '../../_data/profile';
import EmptyState from '../blocks/EmptyState';
import HeadLink from '../blocks/HeadLink';
import Lane, { LANE_ROW } from '../blocks/Lane';
import LaneGhost, {
  GhostRows,
  LANE_ROW_GHOST,
  LinkGhost,
} from '../blocks/LaneGhost';
import LanePoster from '../blocks/LanePoster';
import { LANE_CAPS } from '../blocks/laneCaps';
import {
  factsLine,
  type NextLabel,
  nextLabel,
  relationLine,
} from './both/bothCopy';
import { loadMatch } from './loadMatch';
import { levelStyle } from './match/levels';

const RELATION_GLYPH = {
  'both-favourite': heartGlyph,
  'both-finished': completeGlyph,
  'both-watching': eyeGlyph,
} as const;

const WHEN_TONE: Readonly<Record<NextLabel['tone'], string>> = {
  cyan: 'text-cyan',
  pink: 'text-pink',
  white: 'text-white/80',
};

const ROW_LINK = cn(LANE_ROW, 'transition-colors hover:bg-white/6');

/**
 * The row's three lines beside the 48px poster: title and next, the show's
 * facts, the relation; 24 + 20 + 20 with 4px gaps, the poster's 72px
 */
const LINES_CLASS = 'flex min-w-0 flex-1 flex-col gap-1';

/** The first line: the title and the "what's next" label at its end */
const TITLE_LINE_CLASS = 'flex items-baseline justify-between gap-2.5';

/**
 * The facts and relation lines: one line each (`fit="drop"` keeps a
 * line's height when a show has no facts, so every row is as tall)
 */
const META_LINE_CLASS = 'gap-2.5';

function BothRow({ show, tone }: Readonly<{ show: SharedShow; tone: string }>) {
  const when = nextLabel(show.next);
  const whenClass = cn(
    'shrink-0 whitespace-nowrap text-caption font-medium tabular-nums',
    when ? WHEN_TONE[when.tone] : '',
  );
  const facts = factsLine(show);
  const href = showPath(show.id, show.slug);
  return (
    <li>
      <TileLink className={ROW_LINK} data-show={show.id} href={href}>
        <LanePoster src={show.posterImage} width={48} />
        <span className={LINES_CLASS}>
          <span className={TITLE_LINE_CLASS}>
            <span
              className="min-w-0 truncate text-body-sm font-semibold"
              title={show.title}
            >
              {show.title}
            </span>
            {when ? <span className={whenClass}>{when.text}</span> : null}
          </span>
          <MetaRow className={META_LINE_CLASS} fit="drop">
            <MetaItem icon={calendarGlyph}>{facts.year}</MetaItem>
            <MetaItem icon={seasonGlyph}>{facts.seasons}</MetaItem>
            <MetaItem icon={tagGlyph}>{facts.genre}</MetaItem>
          </MetaRow>
          <MetaRow className={META_LINE_CLASS} fit="drop">
            <MetaItem
              className={tone}
              icon={RELATION_GLYPH[show.relation]}
              shrink
            >
              {relationLine(show)}
            </MetaItem>
          </MetaRow>
        </span>
      </TileLink>
    </li>
  );
}

/**
 * You both watch: shows in both libraries, strongest bond first,
 * each with what comes next, its year, seasons and genre, and what the two
 * of you did with it. The dot and the relation lines have the match
 * level's colour.
 */
export default async function BothWatch({
  profile,
}: Readonly<{ profile: Profile }>) {
  const { match } = await loadMatch(profile);
  const level = levelStyle(match.notEnough ? null : match.level);
  const shows = match.sharedShows.slice(0, LANE_CAPS.bothWatch);
  const shared = libraryPath(profile.user.username, 'all', { with: 'shared' });
  const link = <HeadLink href={shared}>All shared</HeadLink>;
  if (shows.length === 0) {
    return (
      <Lane
        dot="white"
        dotColour={level.dot}
        hollow
        id="b-both"
        title="You both watch"
      >
        <EmptyState
          glyph={usersGlyph}
          sub="Series you both have will show up here."
          title="Nothing shared yet"
        />
      </Lane>
    );
  }
  return (
    <Lane
      count={match.sharedCount}
      dot="white"
      dotColour={level.dot}
      id="b-both"
      link={link}
      title="You both watch"
    >
      <ul
        className="m-0 flex list-none flex-col gap-2.5 p-0"
        data-equal-rows=""
      >
        {shows.map((show) => (
          <BothRow key={show.id} show={show} tone={level.text} />
        ))}
      </ul>
    </Lane>
  );
}

function BothRowGhost() {
  return (
    <div className={LANE_ROW_GHOST}>
      <Ghost className="h-[72px] w-12 shrink-0 rounded-[5px]" />
      <span className={LINES_CLASS}>
        <span className={TITLE_LINE_CLASS}>
          <TextLine className="text-body-sm" width="w-28" />
          <TextLine className="text-caption" width="w-20" />
        </span>
        <MetaRow className={META_LINE_CLASS} fit="drop">
          <TextLine className="text-meta" width="w-32" />
        </MetaRow>
        <MetaRow className={META_LINE_CLASS} fit="drop">
          <TextLine className="text-meta" width="w-36" />
        </MetaRow>
      </span>
    </div>
  );
}

/** You both watch's placeholder: the lane with its four rows */
export function BothWatchSkeleton() {
  const link = <LinkGhost width="w-20" />;
  return (
    <LaneGhost link={link} title="You both watch">
      <GhostRows className="flex flex-col gap-2.5" count={LANE_CAPS.bothWatch}>
        <BothRowGhost />
      </GhostRows>
    </LaneGhost>
  );
}
