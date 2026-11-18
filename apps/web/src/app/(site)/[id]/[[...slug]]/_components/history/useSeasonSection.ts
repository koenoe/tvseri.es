'use client';

import { type MouseEvent, useCallback, useMemo, useState } from 'react';

import { episodeLabel } from '@/lib/marking/copy';
import { useIsSignedIn } from '@/lib/marking/hooks';
import {
  useMarkingStore,
  useMarkingStoreApi,
} from '@/lib/marking/MarkingProvider';
import { episodeKey, pressMark, scopeKey } from '@/lib/marking/pressGate';
import { codeOf, openBefore } from '@/lib/marking/progress';
import type { EpisodeRef } from '@/lib/marking/types';
import useMarking from '@/lib/marking/useMarking';
import type { ShowEpisode } from '@/lib/series/seasonEpisodes';
import useSeasonEpisodes from '@/lib/series/useSeasonEpisodes';
import { openPicker, openUpTo } from '../../_lib/dialogs';
import { useShow } from '../../_lib/ShowProvider';
import type { ShowSeason } from '../../_lib/show';
import { airedRefs, isWatchedChip, type SheetChip } from './chips';
import type { RunCommit } from './paint';
import { seasonMarksSelector } from './seasonMarks';
import { useSheetUi, useSheetUiStore } from './sheetUi';
import { chipStatus, chipTitle } from './status';

const NO_CHIPS: ReadonlyArray<SheetChip> = [];

/**
 * One season of the sheet: its chips and their titles (this season's marks
 * only: a mark in another season renders nothing here), the episodes'
 * details, the chip touched last or asked about, and what a tap, a run, the
 * season toggle and the season's date do.
 */
export default function useSeasonSection(season: ShowSeason) {
  const show = useShow();
  const seriesId = show.id;
  const { seasonNumber } = season;
  // This season's chips only: a mark in another season renders nothing here
  const select = useMemo(
    () => seasonMarksSelector(seriesId, seasonNumber),
    [seriesId, seasonNumber],
  );
  const marks = useMarkingStore(select);
  const markingStore = useMarkingStoreApi();
  const signedIn = useIsSignedIn();
  const marking = useMarking();
  const store = useSheetUiStore();
  const mode = useSheetUi((state) => state.mode);
  const last = useSheetUi((state) =>
    state.last?.seasonNumber === seasonNumber ? state.last : null,
  );
  const ask = useSheetUi((state) =>
    state.ask?.seasonNumber === seasonNumber ? state.ask : null,
  );
  const loaded = useSeasonEpisodes(seriesId, seasonNumber);
  const [now] = useState(Date.now);

  // The viewer's marks seed the show as they stream in: until then the
  // count and the chips are ghosts, nothing to press
  const seeded = marks !== undefined;
  const chips = marks?.chips ?? NO_CHIPS;
  const records = marks?.records;
  const episodes = useMemo(
    () =>
      new Map<number, ShowEpisode>(
        (loaded?.episodes ?? []).map((episode) => [
          episode.episodeNumber,
          episode,
        ]),
      ),
    [loaded],
  );
  const titles = useMemo(
    () =>
      chips.map((chip, index) => {
        const episode = episodes.get(chip.ref.episodeNumber);
        const status = chipStatus(
          chip.state,
          records?.[index],
          episode?.airDate,
          now,
        );
        return chipTitle(
          episodeLabel(chip.ref, episode?.title),
          chip.state,
          status,
          mode === 'upto',
        );
      }),
    [chips, episodes, mode, now, records],
  );
  const minutesOf = useCallback(
    (ref: EpisodeRef) => episodes.get(ref.episodeNumber)?.runtime ?? 0,
    [episodes],
  );
  const label = seasonNumber === 0 ? season.title : `Season ${seasonNumber}`;

  const handleTap = useCallback(
    (chip: SheetChip) => {
      const title = episodes.get(chip.ref.episodeNumber)?.title;
      const name = episodeLabel(chip.ref, title);
      if (mode === 'date') {
        store.setState({ ask: null, last: chip.ref });
        openPicker({ kind: 'one', refs: [chip.ref], seriesId, what: name });
        return;
      }
      // Specials sit outside Up to here (progress ignores them): a tap toggles.
      if (mode === 'upto' && seasonNumber > 0) {
        openUpTo({ at: 'sheet', seriesId, target: chip.ref });
        return;
      }
      // The whole show is read at the tap only: no render subscribes to it
      const view = markingStore.getState().series[seriesId]?.view;
      const asks =
        signedIn === true &&
        view !== undefined &&
        !isWatchedChip(chip.state) &&
        !view.prefs?.neverAskBefore &&
        openBefore(view, chip.ref).length > 0;
      pressMark(episodeKey(seriesId, codeOf(chip.ref)), null, () =>
        marking.toggleEpisode(seriesId, chip.ref, { title, where: 'sheet' }),
      );
      store.setState({ ask: asks ? chip.ref : null, last: chip.ref });
    },
    [
      episodes,
      marking,
      markingStore,
      mode,
      seasonNumber,
      seriesId,
      signedIn,
      store,
    ],
  );

  const handleCommit = useCallback(
    (commit: RunCommit) => {
      if (commit.kind === 'paint') {
        marking.paintRun(seriesId, commit.refs, commit.direction);
      } else if (commit.kind === 'picker') {
        openPicker({
          kind: 'run',
          refs: commit.refs,
          seriesId,
          what: commit.what,
        });
      }
    },
    [marking, seriesId],
  );

  const toggleSeason = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      store.setState({ ask: null, last: null });
      pressMark(scopeKey(seriesId, seasonNumber), event, () =>
        marking.toggleScope(seriesId, seasonNumber),
      );
    },
    [marking, seasonNumber, seriesId, store],
  );

  const dateSeason = useCallback(() => {
    const refs = airedRefs(chips);
    if (refs.length > 0) {
      openPicker({ kind: 'set', refs, seriesId, what: label });
    }
  }, [chips, label, seriesId]);

  return {
    ask,
    chips,
    dateSeason,
    episodes,
    handleCommit,
    handleTap,
    label,
    last,
    minutesOf,
    seeded,
    titles,
    toggleSeason,
  };
}
