'use client';

import { useCallback, useMemo, useState } from 'react';

import { nextEpisode } from '@/lib/marking/progress';
import type { SeriesBase } from '@/lib/marking/types';
import type { ShowSeasonEpisodes } from '../../_lib/seasonEpisodes';
import type { ShowSeason } from '../../_lib/show';
import EpisodesError from './EpisodesError';
import { WallSkeleton } from './EpisodesSkeleton';
import FocusWall from './FocusWall';
import { markEpisodes } from './marks';
import SeasonHeader from './SeasonHeader';
import { StillBackdrop } from './Still';
import {
  INITIAL_WALL_VIEW,
  planWall,
  type WallAction,
  type WallView,
  wallReducer,
} from './wall';

export type WallDispatch = (action: WallAction) => void;

/** The marking view of someone signed out (or before any seed). */
export function signedOutView(
  seriesId: number,
  seasons: ReadonlyArray<ShowSeason>,
): SeriesBase {
  return {
    prefs: null,
    seasons: seasons.map((season) => ({
      airedEpisodeCount: season.airedEpisodeCount,
      episodeCount: season.episodeCount,
      seasonNumber: season.seasonNumber,
    })),
    seriesId,
    skipped: [],
    status: null,
    watched: {},
  };
}

/** One season's wall state (Show all, open stacks), reset per season. */
function useWallView(seasonNumber: number) {
  const [state, setState] = useState<
    Readonly<{ seasonNumber: number; view: WallView }>
  >({ seasonNumber, view: INITIAL_WALL_VIEW });
  if (state.seasonNumber !== seasonNumber) {
    setState({ seasonNumber, view: INITIAL_WALL_VIEW });
  }
  const dispatch = useCallback<WallDispatch>((action) => {
    setState((current) => ({
      ...current,
      view: wallReducer(current.view, action),
    }));
  }, []);
  const view =
    state.seasonNumber === seasonNumber ? state.view : INITIAL_WALL_VIEW;
  return [view, dispatch] as const;
}

type Props = Readonly<{
  seriesId: number;
  seasonNumber: number;
  /** The season's episodes; undefined while they load, null when they failed. */
  season: ShowSeasonEpisodes | null | undefined;
  /** The marks to draw: the store's view, or the signed-out one. */
  view: SeriesBase;
  /**
   * The marks are the viewer's (signed in and read): the facts and the
   * season select show personal states. Signed out (and while the viewer's
   * marks are unknown) they show the season's own facts only.
   */
  personal: boolean;
}>;

/**
 * The section as drawn (header, season line, Focus wall) from a marking
 * view passed in: it never reads the marking store itself, so the static
 * shell's signed-out wall and the viewer's live wall are the same markup.
 */
export default function EpisodesView({
  personal,
  season,
  seasonNumber,
  seriesId,
  view,
}: Props) {
  const nextUp = useMemo(() => nextEpisode(view), [view]);
  const marked = useMemo(
    () =>
      season ? markEpisodes(view, seasonNumber, season.episodes, nextUp) : null,
    [view, season, seasonNumber, nextUp],
  );
  const [wallView, dispatch] = useWallView(seasonNumber);
  // One episode without a still borrows the show's backdrop; more would
  // repeat one picture across the wall (an unreleased season), so
  // they all take the missing-art placeholder instead.
  const backdropStandsIn =
    (season?.episodes.filter((episode) => !episode.stillImage).length ?? 0) <=
    1;
  const plan = useMemo(
    () => (marked ? planWall(marked, wallView) : null),
    [marked, wallView],
  );

  return (
    <>
      <SeasonHeader
        episodes={season?.episodes ?? null}
        marked={marked}
        nextUp={nextUp}
        personal={personal}
        seasonNumber={seasonNumber}
        seriesId={seriesId}
        view={view}
      />
      {plan ? (
        <StillBackdrop value={backdropStandsIn}>
          <FocusWall
            dispatch={dispatch}
            focusLayout={plan.focusLayout}
            seasonNumber={seasonNumber}
            seriesId={seriesId}
            slots={plan.slots}
          />
        </StillBackdrop>
      ) : season === null ? (
        <EpisodesError seasonNumber={seasonNumber} seriesId={seriesId} />
      ) : (
        <WallSkeleton />
      )}
    </>
  );
}
