'use client';

import { useCallback, useState } from 'react';

import {
  initialStage,
  loaded,
  type Stage,
  settle,
  showSlide,
  topLayer,
} from './stage';

/**
 * The stage following the slideshow's slide (state from the last render, no
 * effect): a switch puts the slide on top, waiting for its backdrop when it
 * isn't `ready`; a Back restore (`instant`) replaces the stage. `onSettled`
 * and `onLoaded` are the layers' stable callbacks.
 */
export default function useStage(
  index: number,
  instant: boolean,
  ready: (index: number) => boolean,
) {
  const [stage, setStage] = useState<Stage>(() => initialStage(index));
  if (topLayer(stage).index !== index) {
    setStage(showSlide(stage, index, { instant, waiting: !ready(index) }));
  }
  const onSettled = useCallback(
    (key: number) => setStage((current) => settle(current, key)),
    [],
  );
  const onLoaded = useCallback(
    (key: number) => setStage((current) => loaded(current, key)),
    [],
  );
  return { onLoaded, onSettled, stage, top: topLayer(stage) };
}
