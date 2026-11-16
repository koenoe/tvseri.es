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

import { APP_BODY_CLASS, APP_TOGGLE_CLASS } from './layout';

export type AppId = 'emby' | 'jellyfin' | 'plex';

type Accordion = Readonly<{
  open: AppId | '';
  toggle: (app: AppId) => void;
}>;

const AccordionContext = createContext<Accordion | null>(null);

const useAccordion = (): Accordion => {
  const value = use(AccordionContext);
  if (!value) {
    throw new Error('Wrap the app cards in <AppsAccordion>');
  }
  return value;
};

/**
 * Which app card is open (one at a time, Plex first). The
 * cards themselves stay server-rendered children; only this state and the
 * toggles are client.
 */
export function AppsAccordion({ children }: Readonly<{ children: ReactNode }>) {
  const [open, setOpen] = useState<AppId | ''>('plex');
  const toggle = useCallback(
    (app: AppId) => setOpen((current) => (current === app ? '' : app)),
    [],
  );
  const value = useMemo<Accordion>(() => ({ open, toggle }), [open, toggle]);
  return <AccordionContext value={value}>{children}</AccordionContext>;
}

/** "Open" / "Details" while closed, "Hide" while open. */
export function AppToggle({
  app,
  closedLabel,
  name,
}: Readonly<{ app: AppId; closedLabel: 'Details' | 'Open'; name: string }>) {
  const { open, toggle } = useAccordion();
  const isOpen = open === app;
  const label = isOpen ? 'Hide' : closedLabel;
  const onClick = useCallback(() => toggle(app), [toggle, app]);
  return (
    <Button
      aria-expanded={isOpen}
      aria-label={`${label} ${name}`}
      className={APP_TOGGLE_CLASS}
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
}: Readonly<{ app: AppId; children: ReactNode }>) {
  const { open } = useAccordion();
  return (
    <div className={APP_BODY_CLASS} hidden={open !== app}>
      {children}
    </div>
  );
}
