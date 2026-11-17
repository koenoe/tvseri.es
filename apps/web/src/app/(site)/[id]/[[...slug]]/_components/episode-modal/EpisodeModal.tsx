'use client';

import type { EpisodeRef } from '@tvseri.es/schemas';
import { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

import type { PanelMotion } from '@/components/ui/dialog/dialogMotion';
import { LARGE_MOTION } from '@/components/ui/dialog/dialogMotion';
import LargeDialog from '@/components/ui/dialog/LargeDialog';
import { episodeLabel } from '@/lib/marking/copy';
import { codeOf } from '@/lib/marking/progress';
import useSeasonEpisodes from '@/lib/series/useSeasonEpisodes';
import { useShow } from '../../_lib/ShowProvider';
import { closeEpisode } from '../../_lib/urlState';
import EpisodeView from './EpisodeView';
import { growFrom, isOnScreen, shrinkTo } from './growMotion';
import useEpisodeStepping from './useEpisodeStepping';
import useGrowMotion from './useGrowMotion';

const viewport = () => ({
  height: window.innerHeight,
  width: window.innerWidth,
});

/** The tile an episode's card grows from (or shrinks back into). */
function tileBox(ref: EpisodeRef) {
  const tile =
    document.querySelector(`[data-episode-tile="${codeOf(ref)}"]`) ??
    document.activeElement?.closest('[data-episode-tile]');
  const box = tile?.getBoundingClientRect();
  return box && isOnScreen(box, viewport()) ? box : null;
}

/** The control of an episode's tile that opens its modal */
const tileControl = (ref: EpisodeRef | null): HTMLElement | null =>
  ref
    ? document.querySelector<HTMLElement>(
        `[data-episode-tile="${codeOf(ref)}"] [aria-label^="Open "]`,
      )
    : null;

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
  const [shown, setShown] = useState<EpisodeRef | null>(null);
  const [wasOpen, setWasOpen] = useState(false);
  const [motion, setMotion] = useState<PanelMotion>(LARGE_MOTION);
  const contentRef = useRef<HTMLDivElement>(null);
  const grow = useGrowMotion();

  // Opening (closed → an episode): grow from its tile, read once.
  if (Boolean(episode) !== wasOpen) {
    setWasOpen(Boolean(episode));
    if (episode) {
      const box = tileBox(episode);
      if (box) {
        grow.start(box, viewport());
      }
      setMotion({
        ...(box ? growFrom(box, viewport()) : LARGE_MOTION),
        ...grow.styles,
      });
    }
  }
  if (episode && (!shown || codeOf(episode) !== codeOf(shown))) {
    setShown(episode);
  }
  // Closing keeps `shown`: the exit animates the last episode, not a blank.
  const current = episode ?? shown;

  // The toast's own place (bottom right) is under the credits roll, clear
  // of the record stub on the left: nothing to move while the modal is open.
  const isOpen = Boolean(episode);

  // The exit is read from the last render before the panel unmounts, so it
  // is set (flushed) before the URL closes the modal.
  const aimExit = useCallback(() => {
    const box = current && tileBox(current);
    if (box) {
      flushSync(() => {
        setMotion((previous) => ({
          ...previous,
          exit: shrinkTo(box, viewport()),
        }));
      });
    }
  }, [current]);

  // Back (or any history step) that leaves the modal's entry shrinks it into
  // its tile too. Capture runs before Next's own popstate listener, which is
  // what closes the modal.
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const onPopState = () => {
      if (!new URL(window.location.href).searchParams.has('episode')) {
        aimExit();
      }
    };
    window.addEventListener('popstate', onPopState, { capture: true });
    return () =>
      window.removeEventListener('popstate', onPopState, { capture: true });
  }, [aimExit, isOpen]);

  const close = useCallback(
    (open: boolean) => {
      if (open || !current) {
        return;
      }
      aimExit();
      closeEpisode();
    },
    [aimExit, current],
  );

  // Focus returns to the element that opened the modal; when the wall re-rendered
  // meanwhile and that element is gone, to the tile of the episode shown last
  const currentRef = useRef(current);
  useEffect(() => {
    currentRef.current = current;
  }, [current]);
  const restoreFocus = useCallback(() => tileControl(currentRef.current), []);

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
      open={Boolean(episode)}
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
