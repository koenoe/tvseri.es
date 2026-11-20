import type { ReactNode } from 'react';
import { SWAP_ARRIVE } from '@/components/motion/swap';
import cn from '@/lib/cn';

const ROW =
  'relative grid grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 p-6 xl:flex xl:gap-4';

/** The live header rises into the ghost's box as its card streams in */
const ARRIVING = cn(ROW, SWAP_ARRIVE);

/**
 * The card's header row: tile, name and status, pills, toggle. Below `xl`
 * the pills get their own row: one row needs ~700px (Plex's three pills),
 * more than a card has there, and squeezed the status line becomes a
 * word-wide column. On a phone the toggle joins the pills' row too, so the
 * name and status get the card's full width.
 *
 * The row is the toggle's to press (`APP_TOGGLE_REACH_CLASS`): anything
 * interactive added here needs its own `relative` to sit above that.
 *
 * The live card's header rises into place when it replaces its ghost
 * (`SWAP_ARRIVE`); the ghost passes `arrive={false}` and stays still.
 */
export default function AppHeader({
  arrive = true,
  children,
  name,
  pills,
  status,
  tile,
}: Readonly<{
  /** Rise into place on insertion: the live card, never its ghost */
  arrive?: boolean;
  /** The toggle */
  children: ReactNode;
  name: string;
  pills: ReactNode;
  status: ReactNode;
  tile: ReactNode;
}>) {
  return (
    <div className={arrive ? ARRIVING : ROW}>
      {tile}
      <span className="flex min-w-0 flex-col gap-2 max-md:col-span-2">
        <b className="text-title-3">{name}</b>
        {status}
      </span>
      <span className="flex flex-wrap gap-1.5 max-xl:col-span-full max-xl:row-start-2 max-md:col-span-2 xl:ml-auto">
        {pills}
      </span>
      {children}
    </div>
  );
}
