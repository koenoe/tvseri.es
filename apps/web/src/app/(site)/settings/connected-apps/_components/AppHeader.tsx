import type { ReactNode } from 'react';

/**
 * The card's header row: tile, name and status, pills, toggle. Below `xl`
 * the pills get their own row: one row needs ~700px (Plex's three pills),
 * more than a card has there, and squeezed the status line becomes a
 * word-wide column. On a phone the toggle joins the pills' row too, so the
 * name and status get the card's full width.
 */
export default function AppHeader({
  children,
  name,
  pills,
  status,
  tile,
}: Readonly<{
  /** The toggle */
  children: ReactNode;
  name: string;
  pills: ReactNode;
  status: ReactNode;
  tile: ReactNode;
}>) {
  return (
    <div className="grid grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 p-6 xl:flex xl:gap-4">
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
