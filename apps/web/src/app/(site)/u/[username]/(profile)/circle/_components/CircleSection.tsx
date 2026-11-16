import type { ReactNode } from 'react';

import SectionHead from '@/components/ui/section/SectionHead';
import { formatGrouped } from '@/lib/formatCount';

/**
 * "You follow · 8": the smaller section title, a rule
 * and the count (left out when the counters didn't load)
 */
export default function CircleSection({
  children,
  count,
  id,
  title,
}: Readonly<{
  children: ReactNode;
  count: number | undefined;
  id: string;
  title: string;
}>) {
  const countLabel =
    count === undefined ? undefined : (
      <span className="text-body-sm leading-5 text-white/60 tabular-nums">
        {formatGrouped(count)}
      </span>
    );
  return (
    <section aria-labelledby={id}>
      <SectionHead id={id} link={countLabel} size="side" title={title} />
      {children}
    </section>
  );
}
