import type { ReactNode } from 'react';

import { Ghost, PULSE } from '@/components/ui/ghost/ghosts';
import cn from '@/lib/cn';

import {
  SECTION_HEAD_ROW,
  SECTION_RULE,
  SECTION_TITLE,
  SectionRule,
} from './SectionHead';

/**
 * A `SectionHead` while its block streams: the dot as a flat shape (filled
 * or hollow is data), the real title, the rule, and the link's ghost.
 */
export default function SectionHeadGhost({
  alone = false,
  link,
  title,
}: Readonly<{
  /** over a block that pulses on its own: the dot pulses too */
  alone?: boolean;
  link?: ReactNode;
  title: ReactNode;
}>) {
  const dot = cn('size-2 shrink-0 rounded-full', alone && PULSE);
  return (
    <div className={SECTION_HEAD_ROW}>
      <Ghost className={dot} />
      <span className={SECTION_TITLE}>{title}</span>
      <SectionRule className={SECTION_RULE} />
      {link}
    </div>
  );
}
