'use client';

import { type ReactNode, useState } from 'react';

import { createLoader } from '@/lib/lazy/createLoader';
import { useLoader } from '@/lib/lazy/useLoader';
import { PHONE } from '@/lib/media/breakpoints';
import { matchesNow } from '@/lib/media/useMediaQuery';

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
 * The button that opens the share UI: the phone sheet below `md`, the
 * dialog from it, chosen when it is pressed (one button for every width).
 * The server renders the button's look (`className`, `children`); this owns
 * only the open state. The sheet starts fetching the story card on the tap.
 */
export default function ShareTrigger({
  card,
  children,
  className,
  label,
}: Readonly<{
  card: ShareCard;
  children: ReactNode;
  className: string;
  label: string;
}>) {
  const [open, setOpen] = useState(false);
  // Each opening starts fresh (format, theme, "Link copied")
  const [session, setSession] = useState(0);
  // The panel of the last press: the sheet in the phone layout, else the
  // dialog (read at each press, so a resized window gets the right one)
  const [phone, setPhone] = useState(false);
  const [dialogChunk, loadDialog] = useLoader<ShareChunk>(dialog);
  const [sheetChunk, loadSheet] = useLoader<ShareChunk>(sheet);
  const chunk = phone ? sheetChunk : dialogChunk;
  const preload = () => (matchesNow(PHONE) ? sheet : dialog).preload();
  const openShare = () => {
    const onPhone = matchesNow(PHONE);
    setPhone(onPhone);
    // a failed chunk is tried again on the next tap
    if (onPhone) {
      loadSheet();
      sheet
        .load()
        .then(({ prefetchStory }) => prefetchStory(card))
        .catch(() => undefined);
    } else {
      loadDialog();
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
