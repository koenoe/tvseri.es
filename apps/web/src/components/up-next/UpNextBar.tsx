import type { ReactNode } from 'react';

import Badge from '@/components/ui/button/Badge';
import { GLASS } from '@/components/ui/glass/glass';
import cn from '@/lib/cn';

import {
  UP_NEXT_BAR,
  UP_NEXT_EPISODE,
  UP_NEXT_EPISODE_END,
} from './upNextLayout';

const BAR = cn(UP_NEXT_BAR, GLASS);

/**
 * The card's glass bar: the episode code and title (a control at the end of
 * the line where the place has one), then `children`: the progress, or a
 * pick's "Not started" line.
 */
export default function UpNextBar({
  children,
  code,
  end,
  title,
}: Readonly<{
  children: ReactNode;
  code: string;
  /** A control at the end of the episode line (Home's phone eye) */
  end?: ReactNode;
  title: string;
}>) {
  return (
    <div className={BAR}>
      <span className={UP_NEXT_EPISODE}>
        <Badge className="shrink-0" variant="code">
          {code}
        </Badge>
        <span className="min-w-0 truncate text-title-3 text-white">
          {title}
        </span>
        {end ? <span className={UP_NEXT_EPISODE_END}>{end}</span> : null}
      </span>
      {children}
    </div>
  );
}
