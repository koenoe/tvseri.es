'use client';

import { useState } from 'react';
import { chevronRightGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import { useHiddenShows } from '@/lib/marking/hooks';
import useIntentSeed from '@/lib/marking/useIntentSeed';
import useMarking from '@/lib/marking/useMarking';
import Lane from '../../blocks/Lane';
import LedgerRow from './LedgerRow';
import LedgerShowRow from './LedgerShowRow';
import {
  choiceFor,
  type HoleState,
  holeKey,
  LEDGER_ROWS,
  moreHoles,
  nextLabel,
  statesOf,
} from './ledgerLines';
import type { LedgerEpisodeView, LedgerView } from './loadLedger';
import SeasonChart from './SeasonChart';

const NEXT_LINK =
  'flex min-w-0 cursor-pointer items-center gap-1 whitespace-nowrap text-body-sm font-medium text-white/60 transition-colors hover:text-white';

/**
 * Season ledger: one show's holes at a time, most holes first.
 * "Next: <show>" steps to the next one. A card lists three holes at most
 * (`LEDGER_ROWS`), so its height is bounded; the chart shows every gap and
 * "+N more" opens the rest in the show's history. Watched marks the episode on its
 * release day, Skipped closes the hole for good; both are the marking
 * core's (toast with Undo, rolls back on an error), and the row answers at
 * once with its own Undo.
 */
export default function LedgerLane({
  shows: allShows,
}: Readonly<{ shows: ReadonlyArray<LedgerView> }>) {
  const hidden = useHiddenShows();
  // a show hidden from in progress anywhere in the tab leaves at once
  const shows = allShows.filter((show) => hidden[show.seriesId] !== true);
  const [index, setIndex] = useState(0);
  const [states, setStates] = useState<Readonly<Record<string, HoleState>>>({});
  const marking = useMarking();
  const view = shows[index] ?? shows[0];
  const { intent, run } = useIntentSeed(view?.seriesId ?? 0);
  if (!view) {
    return null;
  }
  const next = shows.length > 1 ? shows[(index + 1) % shows.length] : null;
  const viewStates = statesOf(
    view.seriesId,
    view.episodes.map((episode) => episode.code),
    states,
  );
  const stateOf = (episode: LedgerEpisodeView): HoleState =>
    viewStates[episode.code] ?? 'open';
  const open = view.episodes.filter(
    (episode) => stateOf(episode) === 'open',
  ).length;

  const choose = (episode: LedgerEpisodeView, state: HoleState) => {
    const key = holeKey(view.seriesId, episode.code);
    const before = stateOf(episode);
    const refs = [
      { episodeNumber: episode.episode, seasonNumber: episode.season },
    ];
    const what = `${episode.code} ${episode.title}`;
    const choice = choiceFor(before, state);
    if (!choice) {
      return;
    }
    setStates((previous) => ({ ...previous, [key]: state }));
    const revert = () =>
      setStates((previous) => ({ ...previous, [key]: before }));
    run(() => marking.setWhen(view.seriesId, refs, choice, what), revert);
  };
  const showNext = () => setIndex((index + 1) % shows.length);
  const link = next ? (
    <button
      className={NEXT_LINK}
      onClick={showNext}
      title={`Next: ${next.title}`}
      type="button"
    >
      {/* a long name doesn't fit the card's header: it says "Next show" (the name on hover) */}
      <span className="min-w-0 truncate">{nextLabel(next.title)}</span>
      <Icon className="shrink-0" glyph={chevronRightGlyph} size={13} />
    </button>
  ) : null;

  return (
    <Lane
      className="relative"
      count={open}
      dot="white"
      hollow={open === 0}
      id="season-ledger"
      link={link}
      title="Season ledger"
    >
      <LedgerShowRow more={moreHoles(view.episodes)} open={open} view={view} />
      <SeasonChart states={viewStates} view={view} />
      <div className="flex flex-col gap-2" data-equal-rows="">
        {view.episodes.slice(0, LEDGER_ROWS).map((episode) => (
          <LedgerRow
            episode={episode}
            key={episode.code}
            onChoose={choose}
            onIntent={intent}
            state={stateOf(episode)}
          />
        ))}
      </div>
    </Lane>
  );
}
