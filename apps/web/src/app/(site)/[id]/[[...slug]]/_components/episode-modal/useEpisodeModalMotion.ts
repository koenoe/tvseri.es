'use client';

import type { EpisodeRef } from '@tvseri.es/schemas';
import { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

import type { PanelMotion } from '@/components/ui/dialog/dialogMotion';
import { LARGE_MOTION } from '@/components/ui/dialog/dialogMotion';
import { codeOf } from '@/lib/marking/progress';
import {
  forgetModalOrigin,
  modalOriginFor,
} from '@/lib/navigation/modalOrigin';
import { closeEpisode } from '../../_lib/urlState';
import { growFrom, isOnScreen, shrinkTo } from './growMotion';
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
 * The episode modal's open and close: the card grows from its tile, shrinks
 * back into it on close or Back, keeps the last episode drawn while it
 * leaves (`current`), and gives focus back to the tile. Opened from a card
 * on another page (Home's resume card, `modalOrigin`), it grows from where
 * that card was instead, once; that card is gone, so it closes like any
 * other: into the episode's tile on this page when that is on screen, else
 * with the plain motion.
 */
export default function useEpisodeModalMotion(
  seriesId: number,
  episode: EpisodeRef | null,
) {
  const [shown, setShown] = useState<EpisodeRef | null>(null);
  const [wasOpen, setWasOpen] = useState(false);
  const [motion, setMotion] = useState<PanelMotion>(LARGE_MOTION);
  const grow = useGrowMotion();

  // Opening (closed → an episode): grow from its tile, read once.
  if (Boolean(episode) !== wasOpen) {
    setWasOpen(Boolean(episode));
    if (episode) {
      const origin = modalOriginFor(
        seriesId,
        episode,
        performance.now(),
        viewport(),
      );
      const box = origin ?? tileBox(episode);
      if (box) {
        grow.start(box, viewport());
      }
      const opening = box ? growFrom(box, viewport()) : LARGE_MOTION;
      const exit = origin ? LARGE_MOTION.exit : opening.exit;
      setMotion({ ...opening, exit, ...grow.styles });
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

  // Read during the opening render (`modalOriginFor`), forgotten once open
  useEffect(() => {
    if (isOpen) {
      forgetModalOrigin();
    }
  }, [isOpen]);

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

  return { close, current, isOpen, motion, restoreFocus };
}
