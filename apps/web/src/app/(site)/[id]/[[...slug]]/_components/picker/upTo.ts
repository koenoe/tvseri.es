import { plural } from '@/lib/format/text';
import { codeRange, episodeCode } from '@/lib/marking/copy';
import {
  airedRegularEpisodes,
  codeOf,
  episodeState,
  isWatchedState,
  watchedInSeason,
} from '@/lib/marking/progress';
import type { EpisodeRef, SeriesBase } from '@/lib/marking/types';

/**
 * "I'm up to…": what a target changes, the live
 * hint and the primary button. The plan is `useMarking().markUpTo`'s rule:
 * every open episode up to the target (earlier seasons included, skipped
 * too) is marked; the target season's later watched ones are unmarked.
 */
export type UpToKind = 'now' | 'release' | 'unknown';

export type UpToPlan = Readonly<{
  mark: ReadonlyArray<EpisodeRef>;
  unmark: ReadonlyArray<EpisodeRef>;
}>;

export function upToPlan(view: SeriesBase, target: EpisodeRef): UpToPlan {
  const all = airedRegularEpisodes(view);
  const index = all.findIndex((ref) => codeOf(ref) === codeOf(target));
  return {
    mark: all
      .slice(0, index + 1)
      .filter((ref) => !isWatchedState(episodeState(view, ref))),
    unmark: watchedInSeason(view, target.seasonNumber).filter(
      (ref) => ref.episodeNumber > target.episodeNumber,
    ),
  };
}

/**
 * "Up to S03E05 Children · marks 4 (S03E02–S03E05) · unmarks 1 (S03E07)",
 * or "Pick the last episode you saw." without a target.
 */
export function upToHint(
  target: EpisodeRef | null,
  title: string | undefined,
  plan: UpToPlan,
): string {
  if (!target) {
    return 'Pick the last episode you saw.';
  }
  const name = title ? `${episodeCode(target)} ${title}` : episodeCode(target);
  const marks = plan.mark.length
    ? `marks ${plan.mark.length} (${codeRange(plan.mark)})`
    : 'nothing new to mark';
  const unmarks = plan.unmark.length
    ? ` · unmarks ${plan.unmark.length} (${codeRange(plan.unmark)})`
    : '';
  return `Up to ${name} · ${marks}${unmarks}`;
}

export type UpToKindOption = Readonly<{
  kind: UpToKind;
  label: string;
  /** The line under it. `{time}` is today's time ("21:40"). */
  detail: string;
  /** What the button says: "Mark 4 episodes · just now". */
  short: string;
  isNew: boolean;
}>;

export const UP_TO_KINDS: ReadonlyArray<UpToKindOption> = [
  {
    detail: 'Dated today, {time} · counts in Stats',
    isNew: false,
    kind: 'now',
    label: 'Just now',
    short: 'just now',
  },
  {
    detail: 'Each on its air day · counts in the year it aired',
    isNew: false,
    kind: 'release',
    label: 'On release dates',
    short: 'on release dates',
  },
  {
    detail: 'Counts as watched, not in Stats by date',
    isNew: true,
    kind: 'unknown',
    label: 'I don’t remember',
    short: 'I don’t remember when',
  },
];

/** The primary button: "Mark 4 episodes · just now", "Unmark 1", disabled states. */
export function upToGo(
  target: EpisodeRef | null,
  plan: UpToPlan,
  kind: UpToKind,
): Readonly<{ label: string; disabled: boolean }> {
  if (!target) {
    return { disabled: true, label: 'Pick an episode' };
  }
  const short = UP_TO_KINDS.find((option) => option.kind === kind)?.short;
  if (plan.mark.length) {
    return {
      disabled: false,
      label: `Mark ${plural(plan.mark.length, 'episode')} · ${short}`,
    };
  }
  if (plan.unmark.length) {
    return { disabled: false, label: `Unmark ${plan.unmark.length}` };
  }
  return { disabled: true, label: 'Nothing to change' };
}
