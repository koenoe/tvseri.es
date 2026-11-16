'use client';

import type { CatchingUpItem } from '@tvseri.es/schemas';
import Image from 'next/image';
import { useMemo } from 'react';
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
import {
  CATCHING_UP_HEAD,
  CATCHING_UP_POSTER,
  CATCHING_UP_ROW,
  CATCHING_UP_TEXT,
  CATCHING_UP_TITLE,
} from '../catching-up/runLayout';
import { type RunwayView, runPlan, runwayView } from '../catching-up/runway';
import useLiveCatchingUp from '../catching-up/useLiveCatchingUp';
import useNextUpLabel from '../catching-up/useNextUpLabel';

/** One Catching up show: the run of waiting episodes and the premiere runway */
const POSTER_IMAGE = cn(
  'object-cover shadow-[0_10px_20px_-8px_rgb(0_0_0/0.8)]',
  CATCHING_UP_POSTER,
);
const POSTER_EMPTY = cn('block bg-white/6', CATCHING_UP_POSTER);

/**
 * The row follows the viewer's marks in this tab (`useLiveCatchingUp`): the
 * count, the time left, the run and Next up move on together, and the row
 * leaves once nothing is waiting.
 */
export default function CatchingUpRow({
  item,
  nextUp,
}: Readonly<{ item: CatchingUpItem; nextUp: string }>) {
  const live = useLiveCatchingUp(item);
  const current = live ?? item;
  const plan = useMemo(() => runPlan(current), [current]);
  const serverNextUp = { code: item.nextUp, label: nextUp };
  const nextUpLabel = useNextUpLabel(
    item.seriesId,
    current.nextUp,
    serverNextUp,
  );
  if (!live) {
    return null;
  }
  const href = showPath(item.seriesId, item.slug);
  const runway = runwayView(item);
  const runwayChip = runway
    ? {
        chip: runway.chip,
        chipTitle: runway.chipTitle,
        hint: runway.hint,
        out: runway.kind === 'out',
      }
    : null;
  const waiting = `${live.waiting} ${live.waiting === 1 ? 'episode' : 'episodes'} waiting`;
  const season = Number(/^S(\d+)/.exec(live.nextUp)?.[1] ?? 0) || undefined;
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
                {formatRuntime(live.runtimeMinutes)}
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
          nextUp={nextUpLabel}
          plan={plan}
          runway={runwayChip}
          seriesId={item.seriesId}
        />
        {runway ? <RunwayLine runway={runway} /> : null}
      </div>
    </li>
  );
}

/** "S06 out now · Premiered Sun 15 Nov", or the date and the countdown */
function RunwayLine({ runway }: Readonly<{ runway: RunwayView }>) {
  return (
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
          <MetaItem icon={variantHourglassGlyph}>{runway.countdown}</MetaItem>
        </>
      )}
    </MetaRow>
  );
}
