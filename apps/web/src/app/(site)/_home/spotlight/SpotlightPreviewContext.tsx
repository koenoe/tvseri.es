'use client';

import type { SpotlightLine } from '@tvseri.es/schemas';
import { createContext, type ReactNode, use } from 'react';

/**
 * Preview only (/dev/home): shows the spotlight in a fixed state without a
 * session or a running slideshow. The page itself never renders a provider,
 * so `useSpotlightPreview()` is null there.
 */
export type SpotlightPreview = Readonly<{
  /** the viewer's personal line for the slide showing */
  line?: SpotlightLine;
  /** the slide to open on */
  startAt?: number;
  /** no auto-advance and no Back restore, for side-by-side screenshots */
  still?: boolean;
}>;

const SpotlightPreviewContext = createContext<SpotlightPreview | null>(null);

export function SpotlightPreviewProvider({
  children,
  value,
}: Readonly<{ children: ReactNode; value: SpotlightPreview }>) {
  return (
    <SpotlightPreviewContext value={value}>{children}</SpotlightPreviewContext>
  );
}

export const useSpotlightPreview = () => use(SpotlightPreviewContext);
