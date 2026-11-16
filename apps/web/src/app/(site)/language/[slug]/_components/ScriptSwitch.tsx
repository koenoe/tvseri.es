'use client';

import { LandingSwitch } from '../../../_discover/landing/LandingSwitch';
import type { ScriptTab } from '../_data/language';
import { SCRIPT_SWITCH, WALL_ID } from './wallIds';

/**
 * The script switch (the shared row switch): 日本語 /
 * Rōmaji / English. A press changes every title on the wall in the same
 * frame (all scripts are on the page). On a phone it scrolls with the page
 * on its own swipe line.
 */
export default function ScriptSwitch({
  tabs,
}: Readonly<{ tabs: ReadonlyArray<ScriptTab> }>) {
  return (
    <div className="-mx-gutter mt-12 flex w-[calc(100%+2*var(--page-gutter))] overflow-x-auto scrollbar-none px-[calc(var(--page-gutter)+8px)] md:mx-0 md:mt-6 md:w-auto md:overflow-visible md:px-2">
      <LandingSwitch
        controls={WALL_ID}
        label="Show titles in"
        switchId={SCRIPT_SWITCH}
        tabs={tabs}
      />
    </div>
  );
}
