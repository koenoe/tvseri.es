'use client';

import Link from 'next/link';
import { type MouseEvent, useState } from 'react';
import cn from '@/lib/cn';
import { codeRange } from '@/lib/marking/copy';
import { useEpisodeState, useSeriesView } from '@/lib/marking/hooks';
import { nextKey, pressMark } from '@/lib/marking/pressGate';
import useIntentSeed from '@/lib/marking/useIntentSeed';
import useMarking from '@/lib/marking/useMarking';
import { CHIP, RUN_CLASS, RUN_LINE_CLASS } from './runLayout';
import { type RunChip, type RunPlan, refsUpTo } from './runway';

type Props = Readonly<{
  /** The show page, for "+N" and the next season's chip */
  href: string;
  /** "S05E05 The Last Supper, Part 1" */
  nextUp: string;
  plan: RunPlan;
  runway: Readonly<{
    chip: string;
    chipTitle: string;
    hint: string;
    out: boolean;
  }> | null;
  seriesId: number;
}>;

/**
 * Which run widths show a chip (`runPlan`'s tiers: small below 226px, a 390
 * phone's narrow from 226, the lane's wide from 284), as container queries
 * on the run. Keyed by the first and last tier, small 0 to wide 2.
 */
const TIER_CLASS: Readonly<Record<string, string | undefined>> = {
  '00': '@min-[226px]/run:hidden',
  '01': '@min-[284px]/run:hidden',
  '02': undefined,
  '11': 'hidden @min-[226px]/run:inline-flex @min-[284px]/run:hidden',
  '12': 'hidden @min-[226px]/run:inline-flex',
  '22': 'hidden @min-[284px]/run:inline-flex',
};

/** "+N" per tier: one chip for each run of tiers with the same count */
function moreTiers(counts: ReadonlyArray<number>) {
  const tiers: Array<Readonly<{ count: number; className?: string }>> = [];
  let first = 0;
  counts.forEach((count, tier) => {
    if (counts[tier + 1] === count) {
      return;
    }
    if (count > 0) {
      tiers.push({ className: TIER_CLASS[`${first}${tier}`], count });
    }
    first = tier + 1;
  });
  return tiers;
}

/**
 * The waiting episodes as chips, one row that never wraps: the
 * current season's next few (`runPlan`), "+N" to the rest of the season on
 * the show page, then the tick and one season chip. Hovering a chip lights
 * the run up to it and says what's left; a click marks the waiting chips up
 * to it (Just now), never anything else. Watched chips leave as the store
 * updates (and come back on a rollback).
 */
export default function CatchUpRun({
  href,
  nextUp,
  plan,
  runway,
  seriesId,
}: Props) {
  const [hint, setHint] = useState<string | null>(null);
  const marking = useMarking();
  const { intent, pending, run } = useIntentSeed(seriesId);
  const groupClass = cn(
    'group/eq flex min-w-0 gap-1.5 transition-opacity',
    pending && 'pointer-events-none opacity-50',
  );
  const { chips, more, narrow, next, small } = plan;
  const chipClass = (index: number) =>
    index < small ? undefined : TIER_CLASS[index < narrow ? '12' : '22'];
  const mores = moreTiers([more.small, more.narrow, more.wide]);

  const view = useSeriesView(seriesId);
  // marked chips leave and the next slides into the spot: one press, one mark
  const markUpTo = (chip: RunChip, event: MouseEvent<HTMLButtonElement>) => {
    const refs = refsUpTo(chips, chip, view?.watched ?? {});
    pressMark(nextKey(seriesId), event, () =>
      run(() =>
        marking.markEpisodes(seriesId, refs, { kind: 'now' }, codeRange(refs)),
      ),
    );
  };
  const seasonHref = `${href}?season=${more.season}`;
  const clearHint = () => setHint(null);
  const nextHint = () => setHint(next?.hint ?? null);
  const runwayHint = () => setHint(runway?.hint ?? null);

  return (
    <div
      className={RUN_CLASS}
      onFocus={intent}
      onPointerEnter={intent}
      onTouchStart={intent}
    >
      <div className={RUN_LINE_CLASS}>
        <div
          aria-busy={pending}
          aria-label="Mark episodes as watched up to"
          className={groupClass}
          role="group"
        >
          {chips.map((chip, index) => (
            <Chip
              chip={chip}
              className={chipClass(index)}
              first={index === 0}
              key={chip.code}
              onHint={setHint}
              onMark={markUpTo}
              seriesId={seriesId}
            />
          ))}
        </div>
        {mores.map(({ className, count }) => (
          <MoreChip
            className={className}
            count={count}
            href={seasonHref}
            key={count}
            season={more.season}
          />
        ))}
        {next || runway ? (
          <span
            aria-hidden="true"
            className="h-4 w-0.5 shrink-0 rounded-[1px] bg-white/70"
          />
        ) : null}
        {next ? (
          <Link
            aria-label={next.chipTitle}
            className={cn(
              CHIP,
              'bg-[rgb(0_255_255/0.1)] text-cyan transition-colors hover:bg-[rgb(0_255_255/0.18)]',
            )}
            href={`${href}?season=${next.season}`}
            onPointerEnter={nextHint}
            onPointerLeave={clearHint}
            title={next.chipTitle}
          >
            {next.chip}
          </Link>
        ) : runway ? (
          <span
            className={cn(
              CHIP,
              'cursor-default',
              runway.out
                ? 'bg-[rgb(0_255_255/0.1)] text-cyan'
                : 'bg-[rgb(255_0_128/0.18)] text-pink',
            )}
            onPointerEnter={runwayHint}
            onPointerLeave={clearHint}
            title={runway.chipTitle}
          >
            {runway.chip}
          </span>
        ) : null}
      </div>
      <span className="min-w-0 truncate text-caption text-white/60">
        {hint ?? (
          <>
            <span>Next up:</span>{' '}
            <span className="text-white/80">{nextUp}</span>
          </>
        )}
      </span>
    </div>
  );
}

/** "+8": the rest of the season, on the show page (not a mark target) */
function MoreChip({
  className,
  count,
  href,
  season,
}: Readonly<{
  className?: string;
  count: number;
  href: string;
  season: number;
}>) {
  const label = `${count} more waiting in season ${season}`;
  return (
    <Link
      aria-label={label}
      className={cn(
        CHIP,
        'bg-white/6 text-white/80 transition-colors hover:bg-white/12 hover:text-white',
        className,
      )}
      href={href}
      title={label}
    >
      +{count}
    </Link>
  );
}

function Chip({
  chip,
  className: extra,
  first,
  onHint,
  onMark,
  seriesId,
}: Readonly<{
  chip: RunChip;
  className?: string;
  first: boolean;
  onHint: (hint: string | null) => void;
  onMark: (chip: RunChip, event: MouseEvent<HTMLButtonElement>) => void;
  seriesId: number;
}>) {
  const state = useEpisodeState(seriesId, {
    episodeNumber: chip.episode,
    seasonNumber: chip.season,
  });
  if (state === 'watched' || state === 'unknown') {
    return null;
  }
  const className = cn(
    CHIP,
    'cursor-pointer transition-colors duration-150',
    // the run up to the hovered chip lights up; chips after it stay dim
    'group-hover/eq:bg-white group-hover/eq:text-[#171717] [&:hover~button]:bg-white/6 [&:hover~button]:text-white/80',
    first ? 'bg-white text-[#171717]' : 'bg-white/6 text-white/80',
    extra,
  );
  const leave = () => onHint(null);
  const mark = (event: MouseEvent<HTMLButtonElement>) => onMark(chip, event);
  return (
    <button
      aria-label={`Mark up to ${chip.code} as watched`}
      className={className}
      onBlur={leave}
      onClick={mark}
      onFocus={() => onHint(chip.hint)}
      onPointerEnter={() => onHint(chip.hint)}
      onPointerLeave={leave}
      type="button"
    >
      {chip.label}
    </button>
  );
}
