import type { ReactNode } from 'react';

import AddToChrome from '@/components/extension/AddToChrome';
import ButtonLink from '@/components/ui/button/ButtonLink';
import { Ghost, PULSE } from '@/components/ui/ghost/ghosts';
import { plusGlyph } from '@/components/ui/icon/glyphs';
import cn from '@/lib/cn';
import { extensionInstall } from '@/lib/extension/extension';

/**
 * The call-to-action's shared pieces. Server-safe, so the streamed slot's
 * fallback draws the same boxes.
 */

export const CTA_ROW = 'flex flex-wrap items-center gap-3';

export const CTA_STACK = 'flex flex-col gap-3 md:gap-4';

const STATUS = 'flex items-center gap-2 text-meta text-white/60';

export function CtaStatus({ children }: Readonly<{ children: ReactNode }>) {
  return <p className={STATUS}>{children}</p>;
}

const EDGE_NOTE = 'text-meta text-white/60';
/** Kept but unseen where the extension can't run, so nothing below moves */
const EDGE_NOTE_HIDDEN = `${EDGE_NOTE} invisible`;

export function EdgeNote({ hidden = false }: Readonly<{ hidden?: boolean }>) {
  return (
    <p
      aria-hidden={hidden || undefined}
      className={hidden ? EDGE_NOTE_HIDDEN : EDGE_NOTE}
    >
      On Edge? Allow extensions from other stores first.
    </p>
  );
}

/** Until there is a store listing, the button jumps to the manual install */
export function InstallButton() {
  if (extensionInstall().external) {
    return <AddToChrome />;
  }
  return (
    <ButtonLink href="#install" icon={plusGlyph} variant="primary">
      Install it
    </ButtonLink>
  );
}

/** How it works (130 wide) and the status line (170) as they wait */
const BUTTON_GHOST = cn('h-10 w-32.5 rounded-full', PULSE);
const LINE_GHOST = cn('h-3 w-42.5 rounded-6', PULSE);

/** The first paint, until the browser answers */
export function CtaSkeleton() {
  return (
    <div className={CTA_STACK}>
      <div className={CTA_ROW}>
        <InstallButton />
        <Ghost className={BUTTON_GHOST} />
      </div>
      <div aria-hidden="true" className="flex h-5 items-center">
        <Ghost className={LINE_GHOST} />
      </div>
      <EdgeNote />
    </div>
  );
}
