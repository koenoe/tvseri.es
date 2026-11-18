'use client';

import { format } from 'date-fns';
import { type CSSProperties, useCallback, useMemo, useState } from 'react';

import Button from '@/components/ui/button/Button';
import {
  Dialog,
  DialogClose,
  DialogFooter,
} from '@/components/ui/dialog/Dialog';
import { useNextEpisode } from '@/lib/marking/hooks';
import type { EpisodeRef, SeriesBase } from '@/lib/marking/types';
import useMarking from '@/lib/marking/useMarking';
import useSeasonEpisodes from '@/lib/series/useSeasonEpisodes';
import { closeDialogs, type UpToRequest } from '../../_lib/dialogs';
import { seasonChips, tally } from '../history/chips';
import { AT_ROW, OVER_SHEET, rowPlacement } from './placement';
import { UpToChips, UpToKinds, UpToTabs } from './UpToParts';
import { type UpToKind, upToGo, upToHint, upToPlan } from './upTo';
import useViewWhileOpen from './useViewWhileOpen';

const SUBTITLE =
  'Marks it and everything before it. Later episodes of that season are unmarked.';

const handleOpenChange = (open: boolean) => {
  if (!open) {
    closeDialogs();
  }
};

type Choice = Readonly<{
  request: UpToRequest;
  target: EpisodeRef | null;
  tab: number;
  kind: UpToKind;
  now: number;
}>;

const regularSeasons = (view: SeriesBase) =>
  view.seasons
    .filter((season) => season.seasonNumber > 0)
    .map((season) => season.seasonNumber)
    .sort((a, b) => a - b);

function UpToBody({
  choice,
  onChange,
  view,
}: Readonly<{
  choice: Choice;
  view: SeriesBase;
  onChange: (patch: Partial<Choice>) => void;
}>) {
  const marking = useMarking();
  const next = useNextEpisode(view.seriesId) ?? null;
  const tabSeason = useSeasonEpisodes(view.seriesId, choice.tab);
  const targetSeason = useSeasonEpisodes(
    view.seriesId,
    choice.target?.seasonNumber ?? null,
  );
  const titleOf = useCallback(
    (ref: EpisodeRef) =>
      (ref.seasonNumber === choice.tab
        ? tabSeason
        : targetSeason
      )?.episodes.find((episode) => episode.episodeNumber === ref.episodeNumber)
        ?.title,
    [choice.tab, tabSeason, targetSeason],
  );
  const tabs = useMemo(
    () =>
      regularSeasons(view).map((seasonNumber) => ({
        seasonNumber,
        state: tally(seasonChips(view, seasonNumber, next)).state,
      })),
    [next, view],
  );
  const chips = useMemo(
    () => seasonChips(view, choice.tab, next),
    [choice.tab, next, view],
  );
  const plan = choice.target
    ? upToPlan(view, choice.target)
    : { mark: [], unmark: [] };
  const hint = upToHint(
    choice.target,
    choice.target ? titleOf(choice.target) : undefined,
    plan,
  );
  const go = upToGo(choice.target, plan, choice.kind);
  const pickTab = useCallback((tab: number) => onChange({ tab }), [onChange]);
  const pickTarget = useCallback(
    (target: EpisodeRef) => onChange({ target }),
    [onChange],
  );
  const pickKind = useCallback(
    (kind: UpToKind) => onChange({ kind }),
    [onChange],
  );
  const target = choice.target;
  const apply = useCallback(() => {
    if (go.disabled || !target) {
      return;
    }
    closeDialogs();
    marking.markUpTo(view.seriesId, target, { kind: choice.kind });
  }, [choice.kind, go.disabled, marking, target, view.seriesId]);
  const time = format(choice.now, 'HH:mm');
  const goBlocked = go.disabled || undefined;
  return (
    <>
      <UpToTabs onPick={pickTab} seasons={tabs} tab={choice.tab} />
      <UpToChips
        chips={chips}
        onPick={pickTarget}
        plan={plan}
        target={choice.target}
        titleOf={titleOf}
      />
      <p aria-live="polite" className="min-h-5 text-meta text-white/80">
        {hint}
      </p>
      <UpToKinds kind={choice.kind} onPick={pickKind} time={time} />
      <DialogFooter>
        <DialogClose className="font-semibold">Cancel</DialogClose>
        <Button
          aria-disabled={goBlocked}
          className="font-semibold"
          onClick={apply}
          variant="primary"
        >
          {go.label}
        </Button>
      </DialogFooter>
    </>
  );
}

/**
 * "I'm up to…": "Which episode did you watch
 * last?", season tabs, the season's chips (pick the last one seen), the live
 * hint, three kinds of date, Cancel and "Mark 4 episodes · just now". The
 * first-tracking prompt opens it with no target and I don't remember chosen.
 */
export default function UpToDialog({
  request,
}: Readonly<{ request: UpToRequest | null }>) {
  const [choice, setChoice] = useState<Choice | null>(null);
  const view = useViewWhileOpen(
    request?.seriesId ?? choice?.request.seriesId ?? 0,
    request !== null,
  );
  const next = useNextEpisode(request?.seriesId ?? 0);
  if (request && request !== choice?.request && view) {
    const first = regularSeasons(view)[0] ?? 1;
    setChoice({
      kind: request.defaultWhen ?? 'now',
      now: Date.now(),
      request,
      tab: request.target?.seasonNumber ?? next?.seasonNumber ?? first,
      target: request.target,
    });
  }
  const change = useCallback((patch: Partial<Choice>) => {
    setChoice((current) => (current ? { ...current, ...patch } : current));
  }, []);
  if (!choice || !view) {
    return null;
  }
  const { anchor, at } = choice.request;
  const placement =
    at === 'sheet' ? OVER_SHEET : at === 'row' && anchor ? AT_ROW : undefined;
  const open = request !== null;
  const dialog = (
    <Dialog
      className={placement}
      description={SUBTITLE}
      onOpenChange={handleOpenChange}
      open={open}
      title="Which episode did you watch last?"
    >
      <UpToBody choice={choice} onChange={change} view={view} />
    </Dialog>
  );
  if (at !== 'row' || !anchor) {
    return dialog;
  }
  // The dialog inherits its place from this wrapper (CSS variables).
  const spot = rowPlacement(anchor, {
    height: window.innerHeight,
    width: window.innerWidth,
  });
  const vars = {
    '--ut-left': `${spot.left}px`,
    '--ut-top': `${spot.top}px`,
  } as CSSProperties;
  return (
    <div className="contents" style={vars}>
      {dialog}
    </div>
  );
}
