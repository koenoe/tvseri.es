import type { ReactNode } from 'react';

import { DIARY_MONTH_HEADER } from './diaryStyles';

/**
 * "March 2024 ─── 96 episodes · 76h 54m", at the top of its month. It scrolls with the page (no
 * sticky bars under the sticky glass header; Jump to in the sidebar says
 * which month you're in). Below `lg` (no sidebar) it carries the Jump
 * button (`action`); on a phone beside the title, with the line under them
 * (the board's one row cuts Jump off at 390).
 */
export default function MonthHeader({
  action,
  id,
  line,
  title,
}: Readonly<{
  action?: ReactNode;
  id?: string;
  line: string;
  title: string;
}>) {
  return (
    <div className={DIARY_MONTH_HEADER}>
      <h3 className="whitespace-nowrap text-title-3 max-md:text-[16px]" id={id}>
        {title}
      </h3>
      <span
        aria-hidden="true"
        className="h-0.5 flex-1 rounded-2 bg-white/8 max-md:hidden"
      />
      <span className="whitespace-nowrap text-meta tabular-nums text-white/60 max-md:order-last max-md:basis-full">
        {line}
      </span>
      {action ? <span className="ml-auto flex lg:hidden">{action}</span> : null}
    </div>
  );
}
