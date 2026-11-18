'use client';

import type { EpisodeRef } from '@tvseri.es/schemas';
import { type RefObject, useCallback, useEffect } from 'react';

import { getTopLayer } from '@/components/ui/layer/topLayer';
import { requestSeason } from '@/lib/series/useSeasonEpisodes';
import type { ShowSummary } from '../../_lib/show';
import { openEpisode, toNumberParam } from '../../_lib/urlState';
import { stepEpisode } from './episodeSteps';
import { prefetchEpisode } from './useEpisodeData';

/** The episode the URL shows now (`?season=N&episode=M`). */
function urlEpisode(): EpisodeRef | null {
  const query = new URL(window.location.href).searchParams;
  const seasonNumber = toNumberParam(query.get('season'));
  const episodeNumber = toNumberParam(query.get('episode'));
  return seasonNumber !== null && episodeNumber !== null && episodeNumber > 0
    ? { episodeNumber, seasonNumber }
    : null;
}

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));

/**
 * ‹ › and ←/→ for the modal: steps through the show's episodes (the URL
 * changes; `?season` follows), keys only while the modal is the top layer
 * (not under the date picker), and warms both neighbours (their season,
 * credits and ratings) so a step never waits.
 */
export default function useEpisodeStepping(
  show: Pick<ShowSummary, 'id' | 'seasons'>,
  current: EpisodeRef | null,
  contentRef: RefObject<HTMLElement | null>,
) {
  const step = useCallback(
    (direction: -1 | 1) => {
      // From the URL, which each step updates at once: two quick presses
      // move two episodes, even before React has rendered the first.
      const from = urlEpisode() ?? current;
      const next = from && stepEpisode(show.seasons, from, direction);
      if (next) {
        openEpisode(next);
      }
    },
    [current, show.seasons],
  );

  useEffect(() => {
    if (!current) {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      const content = contentRef.current;
      if (
        (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') ||
        event.defaultPrevented ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        isTyping(event.target) ||
        !content ||
        !getTopLayer()?.contains(content)
      ) {
        return;
      }
      event.preventDefault();
      step(event.key === 'ArrowLeft' ? -1 : 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [contentRef, current, step]);

  useEffect(() => {
    if (!current) {
      return;
    }
    for (const direction of [-1, 1] as const) {
      const next = stepEpisode(show.seasons, current, direction);
      if (next) {
        requestSeason(show.id, next.seasonNumber);
        prefetchEpisode(show.id, next);
      }
    }
  }, [current, show.id, show.seasons]);

  return step;
}
