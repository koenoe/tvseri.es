'use client';

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

import { loadMax } from '@/components/motion/useMaxFeatures';

/**
 * A row opening moves the rows and days below it (the rows
 * below FLIP down, 200ms). One month at a time: its rows and days ask for
 * Motion's `layout="position"` once the month is armed (a pointer went down
 * or focus entered it: before the click that opens a row, never on a mere
 * pass of the pointer while scrolling, which would re-render the month),
 * and measure only when `version` changes (a row in the month opened or
 * closed). Arming also loads `domMax`; `ArmedMaxMotion` switches the month
 * to it. Untouched months measure nothing, and a page appended or a month
 * prepended above never animates anything.
 */

type DiaryLayout = Readonly<{
  armed: boolean;
  version: number;
  arm: () => void;
  bump: () => void;
}>;

const IDLE: DiaryLayout = {
  arm: () => {},
  armed: false,
  bump: () => {},
  version: 0,
};

const DiaryLayoutContext = createContext<DiaryLayout>(IDLE);

/** The props a month's moving parts (days, rows) pass to their `m.div` */
export function useDiaryLayout() {
  const { armed, version } = useContext(DiaryLayoutContext);
  return {
    layout: armed ? ('position' as const) : false,
    layoutDependency: version,
  };
}

/** Called by a row when it opens or closes */
export function useDiaryLayoutBump() {
  return useContext(DiaryLayoutContext).bump;
}

/** The month's arming handlers and its context */
export function useMonthLayout() {
  const [armed, setArmed] = useState(false);
  const [version, setVersion] = useState(0);
  const arm = useCallback(() => {
    setArmed(true);
    void loadMax();
  }, []);
  const bump = useCallback(() => {
    arm();
    setVersion((current) => current + 1);
  }, [arm]);
  const value = useMemo(
    () => ({ arm, armed, bump, version }),
    [arm, armed, bump, version],
  );
  return value;
}

export function DiaryLayoutProvider({
  children,
  value,
}: Readonly<{ children: ReactNode; value: DiaryLayout }>) {
  return (
    <DiaryLayoutContext.Provider value={value}>
      {children}
    </DiaryLayoutContext.Provider>
  );
}
