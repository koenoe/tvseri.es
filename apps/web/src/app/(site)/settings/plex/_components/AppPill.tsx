import type { ReactNode } from 'react';

import cn from '@/lib/cn';

/** A header pill's box (the placeholder draws the same) */
export const APP_PILL_CLASS =
  'inline-flex h-6 items-center whitespace-nowrap rounded-full px-2.5 text-caption font-medium';

/**
 * A pill in a card header: `state` is the status (Available, Coming next,
 * Connected: amber on Plex's connected panel), `quiet` an honest fact (Built
 * in, Needs Plex Pass).
 */
export default function AppPill({
  children,
  connected = false,
  tone = 'quiet',
}: Readonly<{
  children: ReactNode;
  connected?: boolean;
  tone?: 'quiet' | 'state';
}>) {
  const classes = cn(
    APP_PILL_CLASS,
    tone === 'quiet' &&
      'text-white/80 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.2)]',
    tone === 'state' && !connected && 'bg-white/10 text-white',
    tone === 'state' && connected && 'bg-[#e5a00d] text-[#1d1400]',
  );
  return <span className={classes}>{children}</span>;
}
