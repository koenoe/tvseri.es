import type { CatchingUpItem } from '@tvseri.es/schemas';
import Image from 'next/image';
import RowRemote from '@/components/remote/RowRemote';
import {
  calendarGlyph,
  clockGlyph,
  seasonGlyph,
  variantHourglassGlyph,
} from '@/components/ui/icon/glyphs';
import MetaItem from '@/components/ui/meta/MetaItem';
import MetaRow from '@/components/ui/meta/MetaRow';
import TileLink from '@/components/ui/tile/TileLink';
import cn from '@/lib/cn';
import { formatRuntime } from '@/lib/format/duration';
import showPath from '@/lib/routing/showPath';
import CatchUpRun from '../catching-up/CatchUpRun';
import { runPlan, runwayView } from '../catching-up/runway';

/** The row, the poster's box, the text column and its head (the ghost row takes the same) */
export const CATCHING_UP_ROW = 'flex gap-4 px-1 pt-1 pb-0.5';
export const CATCHING_UP_POSTER = 'h-[108px] w-[72px] rounded-8';
export const CATCHING_UP_TEXT = 'flex min-w-0 flex-1 flex-col gap-3';
export const CATCHING_UP_HEAD = 'flex items-start justify-between gap-2.5';
export const CATCHING_UP_TITLE = 'flex min-w-0 flex-1 flex-col gap-2';

/** One Catching up show: the run of waiting episodes and the premiere runway */
const POSTER_IMAGE = cn(
  'object-cover shadow-[0_10px_20px_-8px_rgb(0_0_0/0.8)]',
  CATCHING_UP_POSTER,
);
const POSTER_EMPTY = cn('block bg-white/6', CATCHING_UP_POSTER);

export default function CatchingUpRow({
  item,
  nextUp,
}: Readonly<{ item: CatchingUpItem; nextUp: string }>) {
  const href = showPath(item.seriesId, item.slug);
  const plan = runPlan(item);
  const runway = runwayView(item);
  const runwayChip = runway
    ? {
        chip: runway.chip,
        chipTitle: runway.chipTitle,
        hint: runway.hint,
        out: runway.kind === 'out',
      }
    : null;
  const waiting = `${item.waiting} ${item.waiting === 1 ? 'episode' : 'episodes'} waiting`;
  const season = Number(/^S(\d+)/.exec(item.nextUp)?.[1] ?? 0) || undefined;
  return (
    <li className={CATCHING_UP_ROW}>
      <TileLink
        aria-label={item.title}
        className="shrink-0"
        href={href}
        tabIndex={-1}
      >
        {item.posterImage ? (
          <Image
            alt=""
            className={POSTER_IMAGE}
            height={108}
            src={item.posterImage}
            width={72}
          />
        ) : (
          <span className={POSTER_EMPTY} />
        )}
      </TileLink>
      <div className={CATCHING_UP_TEXT}>
        <div className={CATCHING_UP_HEAD}>
          <div className={CATCHING_UP_TITLE}>
            <TileLink
              className="min-w-0 truncate text-body font-semibold"
              href={href}
              title={item.title}
            >
              {item.title}
            </TileLink>
            <MetaRow fit="drop">
              <MetaItem icon={seasonGlyph}>{waiting}</MetaItem>
              <MetaItem icon={clockGlyph}>
                {formatRuntime(item.runtimeMinutes)}
              </MetaItem>
            </MetaRow>
          </div>
          <RowRemote
            season={season}
            seriesId={item.seriesId}
            slug={item.slug}
            title={item.title}
          />
        </div>
        <CatchUpRun
          href={href}
          nextUp={nextUp}
          plan={plan}
          runway={runwayChip}
          seriesId={item.seriesId}
        />
        {runway ? (
          <MetaRow className="gap-2.5 [&_svg]:size-3" fit="drop">
            {runway.kind === 'out' ? (
              <>
                <span className="shrink-0 font-medium text-cyan">
                  {runway.chip} out now
                </span>
                <MetaItem icon={calendarGlyph}>{runway.date}</MetaItem>
              </>
            ) : (
              <>
                <MetaItem
                  icon={calendarGlyph}
                  tone={runway.tight ? 'pink' : 'default'}
                >
                  {runway.date}
                </MetaItem>
                <MetaItem icon={variantHourglassGlyph}>
                  {runway.countdown}
                </MetaItem>
              </>
            )}
          </MetaRow>
        ) : null}
      </div>
    </li>
  );
}
