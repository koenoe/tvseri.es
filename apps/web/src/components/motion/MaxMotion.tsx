'use client';

import type { ReactNode } from 'react';

import StableLazyMotion from './StableLazyMotion';
import useMaxFeatures, { NOT_YET } from './useMaxFeatures';

/**
 * Wrap the parts that need `domMax` (layout animations, pan and drag): the
 * header's floating morph, Home's spotlight swipe, the profile's piles and
 * accordion. The feature set loads after hydration in its own chunk, once
 * for the page (`useMaxFeatures`). Until it arrives the `m` components
 * inside have no renderer: they draw their current state and don't animate.
 * When it lands they get one, created with their layout projection, so the
 * first morph or swipe already animates. A subtree that mounts after it has
 * loaded (a client navigation) has it from its first render. A failed chunk
 * leaves them plain; the next `MaxMotion` to mount tries again.
 * (Upgrading an existing element from `domAnimation` doesn't work: Motion
 * mounts a projection only with its element.) Anything inside that must
 * animate from the first frame (the header's menu) sits in a nested
 * `MotionProvider` (`domAnimation`). A render of the component around it
 * re-renders only the parts of the subtree that changed
 * (`StableLazyMotion`): a page of Library tiles landing doesn't re-render
 * every tile's `m.li`.
 */
export default function MaxMotion({
  children,
}: Readonly<{ children: ReactNode }>) {
  const max = useMaxFeatures();
  return (
    <StableLazyMotion features={max ?? NOT_YET}>{children}</StableLazyMotion>
  );
}
