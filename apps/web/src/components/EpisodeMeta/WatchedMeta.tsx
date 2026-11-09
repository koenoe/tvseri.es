import type { ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

import Runtime from './Runtime';

/**
 * When an episode was watched, then "— runtime" (left out when unknown, i.e.
 * 0). The watched date stays plain text (no icon); only the runtime gets the
 * clock.
 */
export default function WatchedMeta({
  children,
  className,
  runtime,
}: Readonly<{
  children: ReactNode;
  className?: string;
  runtime: number;
}>) {
  const classes = twMerge('flex items-center gap-1.5', className);

  return (
    <div className={classes}>
      {children}
      {runtime ? (
        <Runtime
          className="opacity-60 before:content-['—']"
          minutes={runtime}
        />
      ) : null}
    </div>
  );
}
