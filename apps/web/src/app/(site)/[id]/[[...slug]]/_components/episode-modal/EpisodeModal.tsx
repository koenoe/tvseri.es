'use client';

import type { EpisodeRef } from '@tvseri.es/schemas';
import { useEffect, useRef } from 'react';

import LargeDialog from '@/components/ui/dialog/LargeDialog';
import { episodeLabel } from '@/lib/marking/copy';
import useSeasonEpisodes from '@/lib/series/useSeasonEpisodes';
import { useShow } from '../../_lib/ShowProvider';
import { closeEpisode } from '../../_lib/urlState';
import EpisodeView from './EpisodeView';
import useEpisodeModalMotion from './useEpisodeModalMotion';
import useEpisodeStepping from './useEpisodeStepping';

/**
 * The episode modal: the
 * card grows into a 1320 × 880 modal (full screen on phones). ‹ › and ←/→
 * step through the show's episodes, Esc closes and focus returns to the tile.
 * `episode` is null while closed; the last one stays drawn (`shown`), so
 * the closing card shrinks into its tile with its content.
 */
export default function EpisodeModal({
  episode,
}: Readonly<{ episode: EpisodeRef | null }>) {
  const show = useShow();
  const { close, current, isOpen, motion, restoreFocus } =
    useEpisodeModalMotion(show.id, episode);
  const contentRef = useRef<HTMLDivElement>(null);

  const step = useEpisodeStepping(show, current, contentRef);
  const season = useSeasonEpisodes(show.id, current?.seasonNumber ?? null);
  const found = season?.episodes.find(
    (item) => item.episodeNumber === current?.episodeNumber,
  );
  const episodeTitle = found?.title;
  // The season's list loaded without this episode (renumbered on TMDB): no
  // made-up "Episode 99" card; the URL loses `episode`, the season stays.
  const missing = isOpen && Boolean(season) && !found;
  useEffect(() => {
    if (missing) {
      closeEpisode();
    }
  }, [missing]);

  // Names the dialog like "S02E06 Fishes".
  const title = current ? episodeLabel(current, episodeTitle) : 'Episode';

  return (
    <LargeDialog
      className="max-lg:bg-[color-mix(in_srgb,var(--color-page)_70%,black)]"
      motion={motion}
      onOpenChange={close}
      open={isOpen}
      restoreFocus={restoreFocus}
      title={title}
    >
      {current ? (
        <EpisodeView
          contentRef={contentRef}
          episode={current}
          onStep={step}
          show={show}
        />
      ) : null}
    </LargeDialog>
  );
}
