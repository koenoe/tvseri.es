'use client';

import { useState, useSyncExternalStore } from 'react';

import Button from '@/components/ui/button/Button';
import { HIT_Y } from '@/components/ui/button/hitArea';
import { Dialog } from '@/components/ui/dialog/Dialog';
import {
  codeGlyph,
  externalGlyph,
  infoGlyph,
} from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import cn from '@/lib/cn';
import {
  readHowItWorks,
  setHowItWorks,
  subscribeHowItWorks,
} from '@/lib/extension/howItWorksHash';
import { createLoader } from '@/lib/lazy/createLoader';
import { useLoader } from '@/lib/lazy/useLoader';

import { ACROSS, DIALOG_WIDTH, DOWN } from './drawingLayout';

const REPO_URL = 'https://github.com/koenoe/tvseri.es';

// The drawing is most of the dialog's weight: load it on first open or
// when a pointer or focus reaches an opener, not with the page
const drawing = createLoader(() =>
  import('./HowItWorksDrawing').then((module) => module.default),
);

const ACROSS_SPACE = cn(ACROSS, 'aspect-[1020/420]');
const DOWN_SPACE = cn(DOWN, 'aspect-[358/900]');

/** Holds each layout's shape until the drawing's chunk is in */
function DrawingSpace() {
  return (
    <>
      <div aria-hidden="true" className={ACROSS_SPACE} />
      <div aria-hidden="true" className={DOWN_SPACE} />
    </>
  );
}

const CAPTION =
  'flex flex-wrap items-center justify-between gap-4 max-lg:flex-col max-lg:items-start max-lg:gap-2';

/** A 20px line, 44 to the pointer */
const REPO_LINK = cn(
  'relative inline-flex items-center gap-1.5 font-medium text-meta text-white/80 underline decoration-white/30 underline-offset-3 transition-colors hover:text-white',
  HIT_Y[12],
);

/** The server never sees the hash: closed until hydrated */
const closedOnServer = () => false;

const openHowItWorks = () => setHowItWorks(true);

/** Marks the page's How it works buttons, so a deep link's close lands on one */
const OPENER = { 'data-how-it-works': '' };

const firstOpener = () =>
  document.querySelector<HTMLElement>('[data-how-it-works]');

/**
 * Open while the hash is `#how-it-works`. Sits outside anything
 * browser-dependent, so a deep link never waits for that.
 */
export function HowItWorksDialog() {
  const open = useSyncExternalStore(
    subscribeHowItWorks,
    readHowItWorks,
    closedOnServer,
  );
  const [HowItWorksDrawing] = useLoader(drawing, open);
  // Whether this open had to wait for the chunk: the drawing then mounts
  // after the panel has settled and skips the panel's delay
  const [late, setLate] = useState(false);
  // false at first, so a dialog that mounts open (a deep link) checks too
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setLate(drawing.get() === null);
    }
  }
  return (
    <Dialog
      className={DIALOG_WIDTH}
      onOpenChange={setHowItWorks}
      open={open}
      restoreFocus={firstOpener}
      title="How it works"
    >
      <figure className="flex min-w-0 flex-col gap-3.5 max-sm:gap-3">
        {HowItWorksDrawing ? (
          <HowItWorksDrawing late={late} />
        ) : (
          <DrawingSpace />
        )}
        <figcaption className={CAPTION}>
          <span className="text-body-sm text-pretty text-white/80 max-sm:text-meta">
            Encrypted with a key held in AWS KMS (AES-256-GCM, tied to your
            account and the service). Only the sync job can decrypt it.
          </span>
          <a
            className={REPO_LINK}
            href={REPO_URL}
            rel="noopener noreferrer"
            target="_blank"
          >
            <Icon glyph={codeGlyph} size={13} />
            github.com/koenoe/tvseri.es
            <Icon glyph={externalGlyph} size={13} />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </figcaption>
      </figure>
    </Dialog>
  );
}

/** Marked, so a deep link's close lands focus on an opener */
export const openHowItWorksProps = {
  'aria-haspopup': 'dialog',
  onClick: openHowItWorks,
  onFocus: drawing.preload,
  onPointerEnter: drawing.preload,
  ...OPENER,
} as const;

export function HowItWorksButton({
  variant = 'outline',
}: Readonly<{ variant?: 'outline' | 'tonal' }>) {
  return (
    <Button icon={infoGlyph} variant={variant} {...openHowItWorksProps}>
      How it works
    </Button>
  );
}
