import { type Overview, seasonCode } from '@tvseri.es/schemas';

import LaneRow from '@/components/lane-row/LaneRow';
import type {
  LaneRowGhostLayout,
  LaneRowLayout,
} from '@/components/lane-row/laneRowLayout';
import RowRemote from '@/components/remote/RowRemote';
import { calendarGlyph, clockGlyph } from '@/components/ui/icon/glyphs';
import MetaItem from '@/components/ui/meta/MetaItem';
import { formatRuntime } from '@/lib/format/duration';
import { formatWhen } from '@/lib/format/when';
import showPath from '@/lib/routing/showPath';

import LanePoster from '../../blocks/LanePoster';
import ToggleEye from '../../blocks/ToggleEye';
import SeasonCompleteLine from './SeasonCompleteLine';

type Item = Overview['outNow'][number];

/*
 * Out now's rows on the shared lane row (the ghost row takes the same). Each place keeps its own look on purpose; don't unify them.
 */
export const OUT_NOW_ROW: LaneRowLayout = {
  code: 'meta',
  // one line: the runtime, then the date, drop whole before one is cut
  meta: 'h-[22px]',
  metaFit: 'drop',
  row: 'flex min-w-0 items-center gap-3',
  text: 'flex min-w-0 flex-1 flex-col gap-[7px]',
  textAs: 'span',
  title: 'min-w-0 truncate text-body-sm font-semibold',
};

export const OUT_NOW_ROW_GHOST: LaneRowGhostLayout = { row: OUT_NOW_ROW.row };

/** The row's two controls */
export const OUT_NOW_CONTROLS = 'flex shrink-0 gap-2';

/** One Out now row: a new episode, or a season on the day it completes */
export default function OutNowRow({
  item,
  now,
}: Readonly<{ item: Item; now: number }>) {
  const isSeason = item.kind === 'season-complete';
  const code = isSeason ? seasonCode(item.season) : (item.code ?? '');
  const markCode = isSeason ? `${code}E01` : (item.code ?? '');
  const poster = <LanePoster src={item.posterImage} width={34} />;
  const facts = isSeason ? (
    <span className="truncate text-caption font-medium text-cyan">
      Season complete
    </span>
  ) : (
    <>
      <MetaItem icon={calendarGlyph}>
        {formatWhen(new Date(item.airDate), now)}
      </MetaItem>
      <MetaItem icon={clockGlyph}>
        {formatRuntime(item.runtimeMinutes)}
      </MetaItem>
    </>
  );
  const footnote = isSeason ? (
    <SeasonCompleteLine
      episodes={item.episodes ?? 0}
      runtimeMinutes={item.runtimeMinutes}
    />
  ) : null;
  const controls = (
    <span className={OUT_NOW_CONTROLS}>
      <ToggleEye
        code={markCode}
        episode={isSeason ? 1 : (item.episode ?? 1)}
        season={item.season}
        seriesId={item.seriesId}
        title={item.title}
      />
      <RowRemote
        season={item.season}
        seriesId={item.seriesId}
        slug={item.slug}
        title={item.title}
      />
    </span>
  );
  return (
    <LaneRow
      as="li"
      code={code}
      end={controls}
      facts={facts}
      footnote={footnote}
      href={showPath(item.seriesId, item.slug)}
      layout={OUT_NOW_ROW}
      poster={poster}
      title={item.title}
    />
  );
}
