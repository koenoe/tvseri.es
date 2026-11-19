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

import type { AppBrand } from '../../_lib/services';
import { APP_BODY_CLASS, APP_TOGGLE_CLASS } from './layout';

type Accordion = Readonly<{
  open: AppBrand | '';
  toggle: (app: AppBrand) => void;
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
  const [open, setOpen] = useState<AppBrand | ''>('plex');
  const toggle = useCallback(
    (app: AppBrand) => setOpen((current) => (current === app ? '' : app)),
    [],
  );
  const value = useMemo<Accordion>(() => ({ open, toggle }), [open, toggle]);
  return <AccordionContext value={value}>{children}</AccordionContext>;
}

/** The toggle's id: where focus goes when the card's own content leaves */
export const appToggleId = (app: AppBrand) => `${app}-toggle`;

/** "Open" while closed, "Hide" while open. */
export function AppToggle({
  app,
  name,
}: Readonly<{ app: AppBrand; name: string }>) {
  const { open, toggle } = useAccordion();
  const isOpen = open === app;
  const label = isOpen ? 'Hide' : 'Open';
  const onClick = useCallback(() => toggle(app), [toggle, app]);
  const accessibleLabel = `${label} ${name}`;
  return (
    <Button
      aria-expanded={isOpen}
      aria-label={accessibleLabel}
      className={APP_TOGGLE_CLASS}
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
  const { open } = useAccordion();
  const closed = open !== app;
  return (
    <div className={APP_BODY_CLASS} hidden={closed}>
      {children}
    </div>
  );
}
