'use client';

import {
  createContext,
  type ReactNode,
  use,
  useCallback,
  useState,
} from 'react';
import { createStore, type StoreApi, useStore } from 'zustand';
import { useShallow } from 'zustand/shallow';

import { Segmented, SegmentedItem } from '@/components/ui/button/Segmented';

import type { PressedTabs } from './neverRepeat';

type SwitchStore = StoreApi<Readonly<{ pressed: PressedTabs }>>;

const createSwitchStore = (): SwitchStore =>
  createStore<Readonly<{ pressed: PressedTabs }>>()(() => ({ pressed: {} }));

/** The default: a row drawn outside a landing (a test) still has tabs */
const SwitchContext = createContext<SwitchStore>(createSwitchStore());

/**
 * The pressed tab of every row switch on a landing, shared by the switch's
 * row and the rows below it (they drop that tab's shows: `neverRepeat`).
 * Every tab's shows are already on the page, so a press swaps the row in
 * the same frame, with no request. One store per landing, and each reader
 * subscribes to the switches it depends on: a press re-renders the
 * switch's own row and the rows below that drop its shows, nothing else.
 */
export function LandingSwitchProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  const [store] = useState(createSwitchStore);
  return <SwitchContext value={store}>{children}</SwitchContext>;
}

/** The pressed tab of one switch (`undefined` until pressed: its first tab) */
export function usePressedTab(switchId: string): string | undefined {
  return useStore(use(SwitchContext), (state) => state.pressed[switchId]);
}

/**
 * The pressed tabs of `switchIds` only (a switch not in it shows its first
 * tab): a press on any other switch doesn't re-render the reader.
 */
export function usePressedTabs(switchIds: ReadonlyArray<string>): PressedTabs {
  return useStore(
    use(SwitchContext),
    useShallow((state) =>
      Object.fromEntries(switchIds.map((id) => [id, state.pressed[id]])),
    ),
  );
}

function usePress(): (switchId: string, tab: string) => void {
  const store = use(SwitchContext);
  return useCallback(
    (switchId: string, tab: string) =>
      store.setState((current) =>
        current.pressed[switchId] === tab
          ? current
          : { pressed: { ...current.pressed, [switchId]: tab } },
      ),
    [store],
  );
}

export type SwitchTab = Readonly<{
  key: string;
  label: string;
  /** the label's language when it isn't the page's (e.g. 日本語) */
  lang?: string;
}>;

/**
 * A row's switch on its own phone line: every row switch sits
 * 8 in from the row's edge on a phone.
 */
export const ROW_SWITCH_CLASS = 'max-md:ml-2';

type Props = Readonly<{
  className?: string;
  /** the id of the rail the tabs fill (`${rowId}-rail`): back to its start on a press */
  controls: string;
  /** the group's name: "Kind of crime", "Shares the tag" */
  label: string;
  switchId: string;
  tabs: ReadonlyArray<SwitchTab>;
}>;

/**
 * A row switch (the shared `Segmented`): the tabs of
 * one row, e.g. Crime by kind. Pass it to `Row`'s `switcher`.
 */
export function LandingSwitch({
  className,
  controls,
  label,
  switchId,
  tabs,
}: Props) {
  const press = usePress();
  const current = usePressedTab(switchId) ?? tabs[0]?.key;
  const onPress = useCallback(
    (id: string, tab: string) => {
      press(id, tab);
      // the new tab starts at its first show, as the design resets the row
      document.getElementById(controls)?.scrollTo({ left: 0 });
    },
    [controls, press],
  );
  return (
    <Segmented className={className} label={label}>
      {tabs.map((tab) => {
        const pressed = tab.key === current;
        return (
          <SwitchItem
            controls={controls}
            key={tab.key}
            label={tab.label}
            lang={tab.lang}
            onPress={onPress}
            pressed={pressed}
            switchId={switchId}
            tab={tab.key}
          />
        );
      })}
    </Segmented>
  );
}

function SwitchItem({
  controls,
  label,
  lang,
  onPress,
  pressed,
  switchId,
  tab,
}: Readonly<{
  controls: string;
  label: string;
  lang: string | undefined;
  onPress: (switchId: string, tab: string) => void;
  pressed: boolean;
  switchId: string;
  tab: string;
}>) {
  const onClick = useCallback(
    () => onPress(switchId, tab),
    [onPress, switchId, tab],
  );
  return (
    <SegmentedItem
      aria-controls={controls}
      lang={lang}
      onClick={onClick}
      pressed={pressed}
    >
      {label}
    </SegmentedItem>
  );
}
