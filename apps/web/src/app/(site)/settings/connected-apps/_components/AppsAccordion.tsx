'use client';

import {
  createContext,
  type ReactNode,
  use,
  useCallback,
  useMemo,
  useState,
} from 'react';
import Button from '@/components/ui/button/Button';
import { chevronDownGlyph } from '@/components/ui/icon/glyphs';
import cn from '@/lib/cn';
import type { AppBrand } from '../../_lib/services';

import {
  APP_BODY_CLASS,
  APP_TOGGLE_CLASS,
  APP_TOGGLE_REACH_CLASS,
} from './layout';

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
  open: AppBrand | '';
}> => {
  const { choose, chosen, needsYou } = useAccordion();
  // Read inside each card's own boundary, which streams after the
  // statuses this waits on are read anyway
  return { choose, open: chosen ?? use(needsYou) };
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

/** "Open" while closed, "Hide" while open. */
export function AppToggle({
  app,
  name,
}: Readonly<{ app: AppBrand; name: string }>) {
  const { choose, open } = useOpen();
  const isOpen = open === app;
  const label = isOpen ? 'Hide' : 'Open';
  const onClick = useCallback(
    () => choose(isOpen ? '' : app),
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
      trailingIcon={chevronDownGlyph}
      variant="tonal"
    >
      {label}
    </Button>
  );
}

/** The card's body: shown while its card is the open one (kept mounted). */
export function AppBody({
  app,
  children,
}: Readonly<{ app: AppBrand; children: ReactNode }>) {
  const { open } = useOpen();
  const closed = open !== app;
  return (
    <div className={APP_BODY_CLASS} hidden={closed}>
      {children}
    </div>
  );
}
