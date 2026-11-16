'use client';

import SeenNote from './SeenNote';

/** "You’ve seen N of M" after a section title (desktop, like a row's) */
export function StartSeenNote({
  ids,
}: Readonly<{ ids: ReadonlyArray<number> }>) {
  return (
    <span className="flex min-w-0 items-center gap-1.5 text-body-sm text-white/60 max-md:hidden">
      <SeenNote ids={ids} />
    </span>
  );
}
