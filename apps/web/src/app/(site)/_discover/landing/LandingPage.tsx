import type { ReactNode } from 'react';

import Page, { PAGE_MAIN_CLASS } from '@/components/background/Page';

import { LandingSwitchProvider } from './LandingSwitch';

type Props = Readonly<{
  children: ReactNode;
  /** The landing's ground, six-digit hex (genre `#1c1916`, theme `#151c1f`) */
  ground: string;
}>;

/**
 * The frame of every Discover landing: the page in its ground colour (no
 * backdrop; a hero draws its own static glow with `LandingHero`), and the
 * switch state the rows share (`LandingSwitchProvider`). Children are the
 * hero, then `LandingSections`.
 */
export default function LandingPage({ children, ground }: Props) {
  return (
    <Page backgroundColor={ground} backgroundContext="none">
      <LandingSwitchProvider>{children}</LandingSwitchProvider>
    </Page>
  );
}

/**
 * A landing before its slug is known (the shell every slug shares): the
 * page's frame with no colour of its own, so the first frame of a hard
 * load never paints a ground that the landing's own then replaces (the
 * show page's skeleton does the same). Children are the skeletons.
 */
export function LandingShell({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <main aria-busy="true" className={PAGE_MAIN_CLASS}>
      <div className="relative z-10">{children}</div>
    </main>
  );
}
