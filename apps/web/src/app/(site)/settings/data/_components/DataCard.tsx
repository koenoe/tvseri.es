import type { ReactNode } from 'react';

import Badge from '@/components/ui/button/Badge';
import cn from '@/lib/cn';

/** A card's "New" badge (12px, 500, not capitals). */
function NewBadge() {
  return (
    <Badge className="ml-auto h-4.5 px-1.5 text-caption font-medium normal-case text-white/80">
      New
    </Badge>
  );
}

/** A card with a dot header; `danger` is the muted red one. */
export function DataCard({
  children,
  danger = false,
  dot,
  title,
}: Readonly<{
  children: ReactNode;
  danger?: boolean;
  dot: string;
  title: string;
}>) {
  const classes = cn(
    'flex flex-col gap-6 rounded-16 p-6',
    danger
      ? 'bg-[rgb(255_90_90/0.03)] shadow-[inset_0_0_0_1px_rgb(255_120_120/0.22)]'
      : 'bg-white/4 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.06)]',
  );
  return (
    <section className={classes}>
      <div className="-mb-2 flex min-h-6 items-center gap-3">
        <span
          aria-hidden="true"
          className={cn('size-2 shrink-0 rounded-full', dot)}
        />
        <h3 className="text-body">{title}</h3>
        <NewBadge />
      </div>
      {children}
    </section>
  );
}

/** A row in a card: title, one grey line, an action on the right. */
export function DataRow({
  action,
  children,
  title,
}: Readonly<{ action: ReactNode; children: ReactNode; title: string }>) {
  return (
    <div className="flex items-center gap-4 max-md:flex-wrap max-md:gap-y-3">
      <span className="flex min-w-0 flex-1 flex-col gap-2 max-md:basis-full">
        <b className="text-body-sm font-semibold">{title}</b>
        <span className="text-meta text-white/60">{children}</span>
      </span>
      {action}
    </div>
  );
}
