'use client';

import { memo } from 'react';

import Badge from '@/components/ui/button/Badge';
import cn from '@/lib/cn';
import { episodeLabel } from '@/lib/marking/copy';
import type { UpToPlan } from '@/lib/marking/progress';
import type { EpisodeRef } from '@/lib/marking/types';
import { chipLabel, type SetState, type SheetChip } from '../history/chips';
import {
  ChipGlyph,
  type ChipOverlay,
  ChipText,
  markChipClass,
} from '../history/MarkChip';
import { UP_TO_KINDS, type UpToKind } from './upTo';

const DOT: Readonly<Record<SetState, string>> = {
  '': 'bg-white/25',
  part: 'bg-white/60',
  w: 'bg-white',
};

/** Season tabs with a dot each: none / partly / complete. */
export const UpToTabs = memo(function UpToTabs({
  onPick,
  seasons,
  tab,
}: Readonly<{
  seasons: ReadonlyArray<Readonly<{ seasonNumber: number; state: SetState }>>;
  tab: number;
  onPick: (seasonNumber: number) => void;
}>) {
  return (
    <div
      className="flex flex-wrap gap-1 self-start rounded-10 bg-black/25 p-1"
      role="tablist"
    >
      {seasons.map((season) => {
        const on = season.seasonNumber === tab;
        const dot = cn('block size-1.5 rounded-full', DOT[season.state]);
        const pick = () => onPick(season.seasonNumber);
        return (
          <button
            aria-selected={on}
            className="flex h-7.5 cursor-pointer items-center gap-1.5 rounded-[7px] px-3 text-body-sm font-medium text-white/60 transition-colors aria-selected:bg-white/15 aria-selected:text-white"
            key={season.seasonNumber}
            onClick={pick}
            role="tab"
            type="button"
          >
            <i aria-hidden="true" className={dot} />
            {`Season ${season.seasonNumber}`}
          </button>
        );
      })}
    </div>
  );
});

const codeOf = (ref: EpisodeRef) => `${ref.seasonNumber}:${ref.episodeNumber}`;

function overlayOf(
  chip: SheetChip,
  target: EpisodeRef | null,
  marks: ReadonlySet<string>,
  unmarks: ReadonlySet<string>,
): ChipOverlay | undefined {
  const code = codeOf(chip.ref);
  if (target && code === codeOf(target)) {
    return 'target';
  }
  if (marks.has(code)) {
    return 'preview';
  }
  return unmarks.has(code) ? 'struck' : undefined;
}

/** The season's chips: target ringed, to-mark lit, to-unmark struck. */
export const UpToChips = memo(function UpToChips({
  chips,
  onPick,
  plan,
  target,
  titleOf,
}: Readonly<{
  chips: ReadonlyArray<SheetChip>;
  target: EpisodeRef | null;
  plan: UpToPlan;
  titleOf: (ref: EpisodeRef) => string | undefined;
  onPick: (ref: EpisodeRef) => void;
}>) {
  const marks = new Set(plan.mark.map(codeOf));
  const unmarks = new Set(plan.unmark.map(codeOf));
  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((chip) => {
        const overlay = overlayOf(chip, target, marks, unmarks);
        const state = chip.state === 'nx' ? '' : chip.state;
        const classes = markChipClass(state, overlay, 'min-w-[58px]');
        const na = state === 'na';
        const aria = `Up to ${episodeLabel(chip.ref, titleOf(chip.ref))}`;
        const pick = () => onPick(chip.ref);
        const unavailable = na || undefined;
        const isTarget = overlay === 'target';
        const struck = state === 'sk' || overlay === 'struck';
        return (
          <button
            aria-disabled={unavailable}
            aria-label={aria}
            aria-pressed={isTarget}
            className={classes}
            key={chip.ref.episodeNumber}
            onClick={na ? undefined : pick}
            type="button"
          >
            <ChipGlyph overlay={overlay} state={state} />
            <ChipText struck={struck}>{chipLabel(chip.ref)}</ChipText>
          </button>
        );
      })}
    </div>
  );
});

/** Just now · On release dates · I don't remember (New). */
export const UpToKinds = memo(function UpToKinds({
  kind,
  onPick,
  time,
}: Readonly<{
  kind: UpToKind;
  time: string;
  onPick: (kind: UpToKind) => void;
}>) {
  return (
    <div
      aria-label="When"
      className="grid grid-cols-3 gap-2 max-sm:grid-cols-1"
      role="radiogroup"
    >
      {UP_TO_KINDS.map((option) => {
        const pick = () => onPick(option.kind);
        const detail = option.detail.replace('{time}', time);
        const checked = option.kind === kind;
        return (
          <button
            aria-checked={checked}
            className="flex min-w-0 cursor-pointer flex-col items-start gap-1 rounded-12 bg-white/5 p-3 text-left transition-[background-color,box-shadow] hover:bg-white/10 aria-checked:bg-white/12 aria-checked:shadow-[inset_0_0_0_1px_rgb(255_255_255/0.5)]"
            key={option.kind}
            onClick={pick}
            role="radio"
            type="button"
          >
            {/* the New badge wraps under a long label in a narrow column
                instead of running past the card */}
            <b className="inline-flex max-w-full flex-wrap items-center gap-x-2 gap-y-1 text-body-sm font-semibold">
              <span className="whitespace-nowrap">{option.label}</span>
              {option.isNew ? <Badge>New</Badge> : null}
            </b>
            <span className="text-caption text-white/60">{detail}</span>
          </button>
        );
      })}
    </div>
  );
});

UpToTabs.displayName = 'UpToTabs';
UpToChips.displayName = 'UpToChips';
UpToKinds.displayName = 'UpToKinds';
