import type { ReactNode } from 'react';
import { TRENDING } from '../../../../../../e2e/fixtures/home/core.ts';
import Spotlight from '../../../_home/spotlight/Spotlight';
import {
  type SpotlightPreview as PreviewState,
  SpotlightPreviewProvider,
} from '../../../_home/spotlight/SpotlightPreviewContext';

const SIGNED_OUT: PreviewState = { still: true };

/** Signed in: the personal line replaces the hook */
const PERSONAL: PreviewState = {
  line: { kind: 'favorite', title: 'Severance' },
  still: true,
};

/**
 * The Pitt (the board's signed-in demo show, watched there): the same two
 * buttons as any show, whatever the viewer did with it
 */
const WATCHED: PreviewState = { startAt: 3, still: true };

/** Task (in progress on the board): the same two buttons too */
const IN_PROGRESS: PreviewState = { startAt: 1, still: true };

/** Stranger Things: no logo, the title as the heading */
const NO_LOGO: PreviewState = { startAt: 5, still: true };

/** Dexter: Resurrection: no tagline, overview or derived line */
const NO_HOOK: PreviewState = { startAt: 9, still: true };

function Variant({
  children,
  id,
  value,
}: Readonly<{ children?: ReactNode; id: string; value: PreviewState }>) {
  return (
    <div id={id}>
      <SpotlightPreviewProvider value={value}>
        <Spotlight items={TRENDING} />
      </SpotlightPreviewProvider>
      {children}
    </div>
  );
}

/**
 * The spotlight (HMFinal `hx-sp`, HMFinalMobile phone 1), each state held
 * still for screenshots; the last one runs as on the page.
 */
export default function SpotlightPreview() {
  return (
    <div className="flex flex-col gap-16">
      <Variant id="spotlight-out" value={SIGNED_OUT} />
      <Variant id="spotlight-personal" value={PERSONAL} />
      <Variant id="spotlight-watched" value={WATCHED} />
      <Variant id="spotlight-progress" value={IN_PROGRESS} />
      <Variant id="spotlight-nologo" value={NO_LOGO} />
      <Variant id="spotlight-nohook" value={NO_HOOK} />
      <div id="spotlight-live">
        <Spotlight items={TRENDING} />
      </div>
    </div>
  );
}
