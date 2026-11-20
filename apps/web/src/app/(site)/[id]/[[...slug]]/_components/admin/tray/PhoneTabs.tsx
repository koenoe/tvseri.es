'use client';

import { type KeyboardEvent, useCallback } from 'react';

import { FILL_BEFORE } from '@/components/motion/glide';
import ChoiceButton from '@/components/ui/button/ChoiceButton';

import { tabLabels } from '../picker';
import type { Tab } from './trayState';
import type { TrayModel } from './useTray';

/**
 * The phone sheet's tabs, the full ARIA tabs pattern: each tab controls the
 * one panel below (its content follows the tab), roving focus, ←/→ wrap,
 * Home and End.
 */

const TABS: ReadonlyArray<Tab> = ['backdrop', 'title'];

/** The next tab for a key (the ARIA tabs pattern: arrows wrap, Home, End). */
function tabFor(key: string, current: Tab): Tab | null {
  const index = TABS.indexOf(current);
  const next: Readonly<Record<string, number>> = {
    ArrowLeft: index - 1 + TABS.length,
    ArrowRight: index + 1,
    End: TABS.length - 1,
    Home: 0,
  };
  const target = next[key];
  return target === undefined ? null : (TABS[target % TABS.length] ?? null);
}

/** The open tab's fill is its `::before`: it glides to the tab chosen (`ChoiceButton`) */
const TAB = `${FILL_BEFORE} h-9 cursor-pointer rounded-8 text-body-sm font-medium text-white/60 transition-colors duration-150 aria-selected:text-white aria-selected:before:bg-white/16`;

export const tabId = (ids: string, tab: Tab) => `${ids}-tab-${tab}`;
export const panelId = (ids: string) => `${ids}-panel`;

function TabButton({
  ids,
  label,
  onSelect,
  selected,
  tab,
}: Readonly<{
  ids: string;
  label: string;
  onSelect: (tab: Tab) => void;
  selected: boolean;
  tab: Tab;
}>) {
  const select = useCallback(() => onSelect(tab), [onSelect, tab]);
  const tabPanelId = panelId(ids);
  const ownId = tabId(ids, tab);
  return (
    <ChoiceButton
      aria-controls={tabPanelId}
      aria-selected={selected}
      className={TAB}
      id={ownId}
      on={selected}
      onClick={select}
      role="tab"
      tabIndex={selected ? 0 : -1}
    >
      {label}
    </ChoiceButton>
  );
}

/** Backdrop and Title, one shared panel below. */
export default function PhoneTabs({
  ids,
  model,
}: Readonly<{ ids: string; model: TrayModel }>) {
  const labels = model.images ? tabLabels(model.images) : null;
  const { setTab } = model;
  const current = model.state.tab;
  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      const next = tabFor(event.key, current);
      if (!next) {
        return;
      }
      event.preventDefault();
      setTab(next);
      document.getElementById(tabId(ids, next))?.focus();
    },
    [current, ids, setTab],
  );
  const tabs: ReadonlyArray<readonly [Tab, string]> = [
    ['backdrop', labels?.backdrop ?? 'Backdrop'],
    ['title', labels?.title ?? 'Title'],
  ];
  return (
    <div
      aria-label="What to change"
      className="grid grid-cols-2 gap-1 rounded-12 bg-white/6 p-1"
      onKeyDown={onKeyDown}
      role="tablist"
    >
      {tabs.map(([tab, label]) => {
        const selected = current === tab;
        return (
          <TabButton
            ids={ids}
            key={tab}
            label={label}
            onSelect={setTab}
            selected={selected}
            tab={tab}
          />
        );
      })}
    </div>
  );
}
