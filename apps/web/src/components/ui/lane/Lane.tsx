import type { ReactNode } from 'react';

import Badge from '@/components/ui/button/Badge';
import cn from '@/lib/cn';

import type { LaneLook } from './laneLooks';

type Head = Readonly<{
  /** After the count: a link, a legend */
  aside?: ReactNode;
  /** The count pill's text, already formatted the place's way; left out: no pill */
  count?: ReactNode;
  /** The 8px dot */
  dot: ReactNode;
  look: LaneLook;
  title: ReactNode;
}>;

/**
 * A lane: a dark panel headed by a dot, the lane's title and a count pill,
 * then its body. Each place gives its look (`laneLooks.ts`), its dot and its
 * count as it formats it; what is in the body is the place's own.
 */
export default function Lane({
  aside,
  children,
  className,
  count,
  dot,
  id,
  look,
  slot,
  title,
}: Head &
  Readonly<{
    children: ReactNode;
    /** The panel's own size or padding where the place sets one */
    className?: string;
    id: string;
    /** The parity marker the place's placeholder checks against */
    slot?: string;
  }>) {
  const panel = cn(look.panel, className);
  const Heading = look.heading;
  return (
    <section aria-labelledby={id} className={panel} data-slot={slot}>
      <div className={look.head}>
        {dot}
        <Heading className={look.title} id={id}>
          {title}
        </Heading>
        {count === undefined ? null : (
          <Badge className={look.count} variant="count">
            {count}
          </Badge>
        )}
        {aside}
      </div>
      {children}
    </section>
  );
}

/**
 * A lane while it streams: the same panel and head with the real title, the
 * dot and the count as the place's ghosts (`dot`, `count`: nodes, left out
 * where the lane has none), then the body's ghosts.
 */
export function LaneGhost({
  aside,
  children,
  className,
  count,
  dot,
  look,
  placeholder,
  title,
}: Omit<Head, 'count'> &
  Readonly<{
    children: ReactNode;
    className?: string;
    /** The count pill's ghost */
    count?: ReactNode;
    /** The parity marker (`data-placeholder`) */
    placeholder?: string;
  }>) {
  const panel = cn(look.panel, look.ghost, className);
  return (
    <div aria-hidden="true" className={panel} data-placeholder={placeholder}>
      <div className={look.head}>
        {dot}
        <span className={look.title}>{title}</span>
        {count}
        {aside}
      </div>
      {children}
    </div>
  );
}
