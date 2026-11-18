'use client';

import { type KeyboardEvent, useId, useRef } from 'react';

import cn from '@/lib/cn';

import NumberedSteps, {
  type NumberedStepsLayout,
} from '../../_components/NumberedSteps';
import { HELP, HELP_TABS } from '../_lib/copy';
import type { HelpTab } from '../_lib/importState';

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
 * short lines each. Without `onTab` it is the static loading frame.
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
          // a phone: the control spans the card and its labels stay on one
          // line at 13px (at 360 "Prime / Video" hung out of it)
          className="flex gap-0.5 rounded-10 bg-black/28 p-0.75 max-md:self-stretch"
          onKeyDown={onKeyDown}
          ref={listRef}
          role="tablist"
        >
          {HELP_TABS.map(([key, label]) => {
            const isOn = key === tab;
            const pick = onTab ? () => onTab(key) : undefined;
            const tabClass = cn(
              'h-7.5 cursor-pointer whitespace-nowrap rounded-[7px] px-3 text-body-sm font-medium transition-[background-color,color] max-md:flex-auto max-md:px-2 max-md:text-meta',
              isOn
                ? 'bg-white/16 text-white'
                : 'text-white/60 hover:text-white',
            );
            const id = tabId(key);
            return (
              <button
                aria-controls={panelId}
                aria-selected={isOn}
                className={tabClass}
                id={id}
                key={key}
                onClick={pick}
                role="tab"
                tabIndex={isOn ? 0 : -1}
                type="button"
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
      <div aria-labelledby={tabLabelId} id={panelId} role="tabpanel">
        <NumberedSteps layout={HELP_STEPS} lines={HELP[tab]} />
      </div>
    </div>
  );
}
