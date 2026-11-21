'use client';

import { useReducedMotion } from 'motion/react';
import * as m from 'motion/react-m';
import {
  createContext,
  type MouseEvent,
  type ReactNode,
  use,
  useCallback,
  useMemo,
  useState,
} from 'react';
import {
  FOLD_OPEN,
  FOLD_OPEN_TIMING,
  FOLD_SHUT,
  FOLD_SHUT_TIMING,
  FOLD_SNAP,
} from '@/components/motion/fold';
import holdInPlace from '@/components/motion/holdInPlace';
import Button from '@/components/ui/button/Button';
import FoldLabel from '@/components/ui/fold/FoldLabel';
import cn from '@/lib/cn';
import type { AppBrand } from '../../_lib/services';

import {
  APP_BODY_CLASS,
  APP_TOGGLE_CLASS,
  APP_TOGGLE_REACH_CLASS,
} from './layout';
import { NeedsYouFlashContext } from './motion/NeedsYouFlash';

type Accordion = Readonly<{
  /** The viewer's own pick; null until they press a toggle */
  chosen: AppBrand | '' | null;
  /** The card that opens on its own (the server's pick) */
  needsYou: Promise<AppBrand | ''>;
  choose: (app: AppBrand | '') => void;
}>;

const AccordionContext = createContext<Accordion | null>(null);

const useAccordion = (): Accordion => {
  const value = use(AccordionContext);
  if (!value) {
    throw new Error('Wrap the app cards in <AppsAccordion>');
  }
  return value;
};

/** The open card: the viewer's pick, else the one that needs them */
const useOpen = (): Readonly<{
  choose: Accordion['choose'];
  /** Nobody has pressed a toggle: the server's pick still holds */
  untouched: boolean;
  open: AppBrand | '';
}> => {
  const { choose, chosen, needsYou } = useAccordion();
  // Read inside each card's own boundary, which streams after the
  // statuses this waits on are read anyway
  return { choose, open: chosen ?? use(needsYou), untouched: chosen === null };
};

/**
 * Which app card is open: one at a time, and at first only a card that
 * needs the viewer (`appNeedingYou`). The cards themselves stay
 * server-rendered children; only this state and the toggles are client.
 */
export function AppsAccordion({
  children,
  needsYou,
}: Readonly<{ children: ReactNode; needsYou: Promise<AppBrand | ''> }>) {
  const [chosen, choose] = useState<AppBrand | '' | null>(null);
  const value = useMemo<Accordion>(
    () => ({ choose, chosen, needsYou }),
    [chosen, needsYou],
  );
  return <AccordionContext value={value}>{children}</AccordionContext>;
}

const TOGGLE = cn(APP_TOGGLE_CLASS, APP_TOGGLE_REACH_CLASS);

/** The toggle's id: where focus goes when the card's own content leaves */
export const appToggleId = (app: AppBrand) => `${app}-toggle`;

/** The longer fold (opening): the pressed header is held for its length */
const FOLD_MS = FOLD_OPEN_TIMING.height.duration * 1000;

/**
 * "Open" while closed, "Hide" while open, cross-fading in one width; the
 * chevron turns. Opening a card shuts the open one, which may be above it:
 * the pressed header stays under the pointer while that fold runs.
 */
export function AppToggle({
  app,
  name,
}: Readonly<{ app: AppBrand; name: string }>) {
  const { choose, open } = useOpen();
  const isOpen = open === app;
  const label = isOpen ? 'Hide' : 'Open';
  const onClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      holdInPlace(event.currentTarget, FOLD_MS);
      choose(isOpen ? '' : app);
    },
    [choose, isOpen, app],
  );
  const accessibleLabel = `${label} ${name}`;
  return (
    <Button
      aria-expanded={isOpen}
      aria-label={accessibleLabel}
      className={TOGGLE}
      id={appToggleId(app)}
      onClick={onClick}
      variant="tonal"
    >
      <FoldLabel label="Open" open={isOpen} openLabel="Hide" size={13} />
    </Button>
  );
}

/** Shut and settled, the body is hidden as well: out of reach for find and assistive tech */
const BODY_OPEN = { ...FOLD_OPEN, visibility: 'visible' } as const;
const BODY_SHUT = {
  ...FOLD_SHUT,
  transitionEnd: { visibility: 'hidden' },
} as const;

/**
 * The card's body, kept mounted: it folds open and shut as the calendar's No
 * date yet does (`components/motion/fold`), and a shut one is inert. Every
 * card arrives shut, as its header-only placeholder, so nothing below jumps;
 * the one that needs the viewer then plays its fold open and, once it has
 * ended, flashes round its primary action (`FlashTarget`). A press on any
 * toggle first calls that off.
 */
export function AppBody({
  app,
  children,
}: Readonly<{ app: AppBrand; children: ReactNode }>) {
  const { open, untouched } = useOpen();
  const reduced = useReducedMotion();
  const opened = open === app;
  // Opened by the server's pick, not a press: its fold is the arrival
  const [arrivedOpen] = useState(opened && untouched);
  const [flash, setFlash] = useState<'due' | 'done' | 'none'>('none');
  const shutTiming = reduced ? FOLD_SNAP : FOLD_SHUT_TIMING;
  const openTiming = reduced ? FOLD_SNAP : FOLD_OPEN_TIMING;
  const transition = opened ? openTiming : shutTiming;
  const settled = useCallback(() => {
    if (arrivedOpen && opened && untouched) {
      setFlash((now) => (now === 'none' ? 'due' : now));
    }
  }, [arrivedOpen, opened, untouched]);
  const flashValue = useMemo(
    () => ({ due: flash === 'due' && untouched, end: () => setFlash('done') }),
    [flash, untouched],
  );
  return (
    <m.div
      animate={opened ? BODY_OPEN : BODY_SHUT}
      className="overflow-hidden"
      inert={!opened}
      initial={BODY_SHUT}
      onAnimationComplete={settled}
      transition={transition}
    >
      <NeedsYouFlashContext value={flashValue}>
        <div className={APP_BODY_CLASS}>{children}</div>
      </NeedsYouFlashContext>
    </m.div>
  );
}
