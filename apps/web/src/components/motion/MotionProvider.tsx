'use client';

import { domAnimation, LazyMotion, MotionConfig } from 'motion/react';
import type { ReactNode } from 'react';

/**
 * Loads `domMax` (layout animations and pan/drag) on demand, through
 * `useMaxFeatures` (once per page, for `MaxMotion` and `ArmedMaxMotion`).
 * Every other `m` component works with `domAnimation` alone.
 */
export const loadMaxFeatures = () =>
  import('./maxFeatures').then((mod) => mod.default);

/**
 * The app's one Motion setup (root layout): `LazyMotion` + `m` components, so
 * routes ship Motion's small core plus `domAnimation` (animate, exit,
 * variants, hover/tap/focus, in-view) instead of the full `motion`
 * component. `strict` makes a `motion.*` component anywhere below throw in
 * development and tests (Biome's `noRestrictedImports` blocks the import).
 *
 * `m` comes from `motion/react-m` (`import * as m`), everything else from
 * `motion/react` (motion.dev, "Reduce bundle size").
 *
 * Parts that need layout animations or pan/drag sit in a `MaxMotion`, which
 * loads `domMax` on demand in its own chunk.
 *
 * `reducedMotion="user"`: with `prefers-reduced-motion: reduce` every move
 * (x, y, scale, rotate, size) and layout morph below is instant; opacity
 * and colour still fade. Motion's own default ignores the setting.
 */
export default function MotionProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <MotionConfig reducedMotion="user">
      <LazyMotion features={domAnimation} strict>
        {children}
      </LazyMotion>
    </MotionConfig>
  );
}
