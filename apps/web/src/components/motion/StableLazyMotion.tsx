'use client';

import { LazyMotion } from 'motion/react';
import {
  type ComponentProps,
  createContext,
  type ReactNode,
  use,
  useMemo,
} from 'react';

type Features = ComponentProps<typeof LazyMotion>['features'];

/** The subtree, handed past the `LazyMotion` element (see `Slot`) */
const SlotContext = createContext<ReactNode>(null);

/** Draws the subtree inside `LazyMotion` without being its `children` prop */
function Slot() {
  return use(SlotContext);
}

/**
 * A strict `LazyMotion` that re-renders only when its features change.
 * `LazyMotion` hands every `m` element below a new context value each time
 * it renders, which re-renders all of them, memoised rows included, on any
 * render of the component around it. Here its element is kept while the
 * features don't change, and the subtree reaches it through `SlotContext`,
 * where a new subtree re-renders only what changed in it. (`LazyMotion`
 * still re-renders itself when a lazy bundle lands, which gives the `m`
 * elements their renderer.)
 */
export default function StableLazyMotion({
  children,
  features,
}: Readonly<{ children: ReactNode; features: Features }>) {
  const motion = useMemo(
    () => (
      <LazyMotion features={features} strict>
        <Slot />
      </LazyMotion>
    ),
    [features],
  );
  return <SlotContext value={children}>{motion}</SlotContext>;
}
