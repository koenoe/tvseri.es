'use client';

import { useMotionValue, useTransform } from 'motion/react';
import { useCallback, useMemo } from 'react';

import type { PanelMotion } from '@/components/ui/dialog/dialogMotion';

import { coverContent, panelSize } from './growMotion';

type Box = Readonly<{ width: number; height: number }>;
type Viewport = Readonly<{ width: number; height: number }>;

/**
 * The motion values behind the grow (`growMotion.ts`): the panel's two
 * scales drive, per frame, the content's cover scale, so the card starts on
 * the tile's exact box without stretching the still. Transforms only: the
 * corner radius is not animated (re-rastering the panel's rounded clip every
 * frame cost 31–36ms frames on a production build; fixed, 23–25ms).
 */
export default function useGrowMotion() {
  const scaleX = useMotionValue(1);
  const scaleY = useMotionValue(1);
  const contentScaleX = useTransform(
    () => coverContent(scaleX.get(), scaleY.get()).scaleX,
  );
  const contentScaleY = useTransform(
    () => coverContent(scaleX.get(), scaleY.get()).scaleY,
  );

  const styles = useMemo<Pick<PanelMotion, 'contentStyle' | 'style'>>(
    () => ({
      contentStyle: { scaleX: contentScaleX, scaleY: contentScaleY },
      style: { scaleX, scaleY },
    }),
    [contentScaleX, contentScaleY, scaleX, scaleY],
  );

  /** Puts the panel on the tile now, so the first frame is already on it. */
  const start = useCallback(
    (tile: Box, viewport: Viewport) => {
      const panel = panelSize(viewport);
      scaleX.jump(tile.width / panel.width);
      scaleY.jump(tile.height / panel.height);
    },
    [scaleX, scaleY],
  );

  return { start, styles };
}
