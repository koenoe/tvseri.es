'use client';

import { type ReactNode, useState } from 'react';

import { createLoader } from '@/lib/lazy/createLoader';
import { useLoader } from '@/lib/lazy/useLoader';

import type { ShareCard } from './shareCard';

/**
 * Loaded on first use (or hover, focus), so neither the panels nor the card
 * helpers (paths, file fetching) are in the first-load JS
 */
const dialog = createLoader(() =>
  import('./ShareDialog').then(({ default: Panel }) => ({ Panel })),
);
const sheet = createLoader(() =>
  import('./ShareSheet').then(({ default: Panel, prefetchStory }) => ({
    Panel,
    prefetchStory,
  })),
);

type ShareChunk =
  | NonNullable<ReturnType<typeof dialog.get>>
  | NonNullable<ReturnType<typeof sheet.get>>;

/**
 * A button that opens the share UI: the desktop dialog or the phone sheet.
 * The server renders the button's look (`className`, `children`); this owns
 * only the open state. The sheet starts fetching the story card on the tap.
 */
export default function ShareTrigger({
  card,
  children,
  className,
  label,
  mode,
}: Readonly<{
  card: ShareCard;
  children: ReactNode;
  className: string;
  label?: string;
  mode: 'dialog' | 'sheet';
}>) {
  const [open, setOpen] = useState(false);
  // Each opening starts fresh (format, theme, "Link copied")
  const [session, setSession] = useState(0);
  const loader = mode === 'sheet' ? sheet : dialog;
  const preload = loader.preload;
  const [chunk, load] = useLoader<ShareChunk>(loader);
  const openShare = () => {
    // a failed chunk is tried again on the next tap
    load();
    if (mode === 'sheet') {
      sheet
        .load()
        .then(({ prefetchStory }) => prefetchStory(card))
        .catch(() => undefined);
    }
    setSession((value) => value + 1);
    setOpen(true);
  };
  const Panel = chunk?.Panel;
  return (
    <>
      <button
        aria-haspopup="dialog"
        aria-label={label}
        className={className}
        onClick={openShare}
        onFocus={preload}
        onPointerEnter={preload}
        type="button"
      >
        {children}
      </button>
      {session > 0 && Panel ? (
        <Panel card={card} key={session} onOpenChange={setOpen} open={open} />
      ) : null}
    </>
  );
}
