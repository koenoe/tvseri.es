'use client';

import { type KeyboardEvent, useId, useRef } from 'react';
import SwapIn from '@/components/motion/SwapIn';
import ChoiceButton from '@/components/ui/button/ChoiceButton';
import cn from '@/lib/cn';
import NumberedSteps, {
  type NumberedStepsLayout,
} from '../../_components/NumberedSteps';
import { HELP, HELP_TABS } from '../_lib/copy';
import type { HelpTab } from '../_lib/importState';
import { SEGMENT_BASE, SEGMENTED } from './styles';

/**
 * The importer's segmented control; on a phone it spans the card and its
 * labels stay on one line at 13px (at 360 "Prime / Video" hung out of it)
 */
const TABS = cn(SEGMENTED, 'max-md:self-stretch');
/**
 * A tab reaches 10px up only (40px to the pointer): above is the card's
 * title, plain text; a reach below would spill out of the tab and read as
 * its label overflowing the control
 */
const TAB = cn(
  SEGMENT_BASE,
  'max-md:flex-auto max-md:px-2 max-md:text-meta',
  'after:absolute after:inset-x-0 after:-top-2.5 after:bottom-0',
);

/** Each place keeps its own look on purpose; don't unify them. */
const HELP_STEPS: NumberedStepsLayout = {
  item: 'grid grid-cols-[24px_minmax(0,1fr)] gap-x-3.5',
  list: 'flex flex-col gap-3',
  text: 'pt-0.5 text-meta leading-5 text-white/80',
};

const NEXT_KEY: Readonly<Record<string, number>> = {
  ArrowLeft: -1,
  ArrowRight: 1,
};

/**
 * "Where do I get my file?": Netflix / Prime Video /
 * Other CSV as ARIA tabs (arrow keys move and select, Home/End jump), three
 * short lines each; a tab's lines rise in as a tab panel's body does
 * (`SwapIn`), inside one panel that keeps its id (the tabs' fill glides).
 * Without `onTab` it is the static loading frame.
 */
export default function HelpCard({
  onTab,
  tab,
}: Readonly<{ tab: HelpTab; onTab?: (tab: HelpTab) => void }>) {
  const id = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const panelId = `${id}-panel`;
  const tabId = (key: HelpTab) => `${id}-${key}`;
  const selected = HELP_TABS.findIndex(([key]) => key === tab);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = NEXT_KEY[event.key];
    const count = HELP_TABS.length;
    const target =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? count - 1
          : step === undefined
            ? null
            : (selected + step + count) % count;
    const next = target === null ? undefined : HELP_TABS[target];
    if (!next || !onTab) {
      return;
    }
    event.preventDefault();
    onTab(next[0]);
    listRef.current
      ?.querySelector<HTMLButtonElement>(`#${CSS.escape(tabId(next[0]))}`)
      ?.focus();
  };
  const tabLabelId = tabId(tab);

  return (
    <div className="flex flex-col gap-4 rounded-16 bg-white/4 p-6 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.06)] max-md:p-6">
      <div className="flex items-center justify-between gap-4 max-md:flex-col max-md:items-start">
        <b className="text-body font-semibold">Where do I get my file?</b>
        <div
          aria-label="Where to get your file"
          className={TABS}
          onKeyDown={onKeyDown}
          ref={listRef}
          role="tablist"
        >
          {HELP_TABS.map(([key, label]) => {
            const isOn = key === tab;
            const pick = onTab ? () => onTab(key) : undefined;
            const buttonId = tabId(key);
            return (
              <ChoiceButton
                aria-controls={panelId}
                aria-selected={isOn}
                className={TAB}
                id={buttonId}
                key={key}
                on={isOn}
                onClick={pick}
                role="tab"
                tabIndex={isOn ? 0 : -1}
              >
                {label}
              </ChoiceButton>
            );
          })}
        </div>
      </div>
      <div aria-labelledby={tabLabelId} id={panelId} role="tabpanel">
        <SwapIn swapKey={tab}>
          <NumberedSteps layout={HELP_STEPS} lines={HELP[tab]} />
        </SwapIn>
      </div>
    </div>
  );
}
