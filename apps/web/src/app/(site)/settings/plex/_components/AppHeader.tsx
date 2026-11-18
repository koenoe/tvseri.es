import type { ReactNode } from 'react';

/**
 * The card's header row: tile, name + status, pills, and the toggle. Below
 * `xl` the pills drop to their own row under the tile and name, and the
 * toggle stays top right: one row needs ~700px (Plex's three pills), more
 * than a card holds below `xl` (~656px at 768 without the nav, ~600px at
 * 1024 beside it); squeezed, the status line would be a word-wide column
 * under the pills. On a phone the toggle joins the pills' row too, so the
 * name and status have the card's width (beside it they take three lines
 * between the logo and Hide).
 */
export default function AppHeader({
  children,
  name,
  pills,
  status,
  tile,
}: Readonly<{
  /** The toggle button */
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
