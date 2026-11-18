'use client';

import { createContext, type ReactNode, use } from 'react';

import StableLazyMotion from './StableLazyMotion';
import useMaxFeatures, { NOT_YET } from './useMaxFeatures';

const LiveContext = createContext(false);

/**
 * Motion for a large subtree that animates only after an interaction
 * (History's months, Stats' timeline): until `armed`, and while `domMax`
 * has not loaded (or failed to), its `m` elements have no renderer, so no
 * visual element or layout projection and nothing to update; once both,
 * they get `domMax` in that same render and keep their DOM. Arm it before
 * the change that should animate (a pointer down, focus, the first sort).
 *
 * An `m` element without a renderer draws its `initial` (motion.dev,
 * "Reduce bundle size": the animation runs when the features resolve), so
 * anything inside that enters from hidden reads `useMotionLive()` and
 * enters plainly when Motion is not live.
 */
export default function ArmedMaxMotion({
  armed,
  children,
}: Readonly<{ armed: boolean; children: ReactNode }>) {
  const max = useMaxFeatures();
  const live = armed && max !== null;
  const features = live ? max : NOT_YET;
  return (
    <LiveContext value={live}>
      <StableLazyMotion features={features}>{children}</StableLazyMotion>
    </LiveContext>
  );
}

/** Whether the nearest `ArmedMaxMotion` animates now (false outside one) */
export function useMotionLive(): boolean {
  return use(LiveContext);
}
