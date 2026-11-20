import { formatGrouped } from '@tvseri.es/utils';
import { AnimatePresence } from 'motion/react';
import type { ReactNode } from 'react';

import FoldPresence from '@/components/motion/FoldPresence';
import { chevronRightGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import { ignoreKeyRepeat } from '@/lib/a11y/ignoreKeyRepeat';
import cn from '@/lib/cn';

/**
 * A collapsible group of review items; the header is the disclosure. Its
 * items fold open and shut (the shared fold, as Connected apps' review
 * groups) while the chevron turns: a shut that cut at once read as a
 * different control from the open. A group open on the first paint stays
 * still.
 */
export default function ProblemGroup({
  action,
  bodyId,
  children,
  count,
  name,
  onToggle,
  open,
  what,
}: Readonly<{
  /** Outside the disclosure; while it asks (`data-asking`) it takes its own line */
  action?: ReactNode;
  /** Unique on the page: two lists may share it */
  bodyId: string;
  children: ReactNode;
  count: number;
  name: string;
  onToggle: () => void;
  open: boolean;
  what: string;
}>) {
  const chevronClass = cn(
    'text-white/60 transition-[color,rotate] duration-200 group-hover/toggle:text-white',
    open && 'rotate-90',
  );
  // Only while the items are drawn: a shut group has nothing to point at
  const controls = open ? bodyId : undefined;
  return (
    <div
      className="overflow-hidden rounded-16 bg-white/3.5 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.07)]"
      data-problem-group=""
    >
      <div className="flex flex-wrap items-center">
        <button
          aria-controls={controls}
          aria-expanded={open}
          className="group/toggle grid min-h-14 min-w-0 flex-1 cursor-pointer grid-cols-[16px_auto_auto_minmax(0,1fr)] items-center gap-3 px-6 text-left focus-visible:outline-2 focus-visible:outline-white focus-visible:-outline-offset-2 max-md:grid-cols-[16px_minmax(0,1fr)_auto] max-md:gap-y-1 max-md:px-4 max-md:py-3"
          onClick={onToggle}
          type="button"
        >
          <Icon className={chevronClass} glyph={chevronRightGlyph} size={16} />
          <b className="whitespace-nowrap text-body-sm font-semibold">{name}</b>
          <span className="inline-flex h-5.5 items-center justify-self-start rounded-full bg-white/10 px-2 text-caption font-medium tabular-nums max-md:justify-self-end">
            {formatGrouped(count)}
          </span>
          <span className="justify-self-end truncate text-meta leading-5 text-white/60 max-md:col-start-2 max-md:col-end-[-1] max-md:justify-self-start max-md:whitespace-normal">
            {what}
          </span>
        </button>
        {action ? (
          <div className="px-6 py-2 has-[[data-asking]]:basis-full has-[[data-asking]]:pt-0 has-[[data-asking]]:pb-3 max-md:w-full max-md:px-4 max-md:pt-0 max-md:pb-3">
            {action}
          </div>
        ) : null}
      </div>
      <AnimatePresence initial={false}>
        {open ? (
          <FoldPresence key="body">
            <div
              className="flex flex-col px-6 pb-2 max-md:px-4"
              data-problem-list=""
              id={bodyId}
            >
              {children}
            </div>
          </FoldPresence>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/**
 * `itemKey` lets a list move focus to it once its neighbour leaves;
 * `data-problem-item` lets a press inside keep its focus (`keepFocusInItem`).
 * A press moves focus to the item's next control (Skip, then Undo), so a
 * held Enter presses only once (`ignoreKeyRepeat`).
 */
export function ProblemItemFrame({
  children,
  count,
  itemKey,
  title,
  why,
}: Readonly<{
  children?: ReactNode;
  count: string;
  itemKey?: string;
  title: string;
  why: string;
}>) {
  return (
    <div
      className="flex flex-col gap-3 border-white/6 border-t py-4"
      data-problem-item=""
      data-problem-key={itemKey}
      onKeyDownCapture={ignoreKeyRepeat}
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1">
        <b
          className="truncate text-body-sm font-medium text-white"
          title={title}
        >
          {title}
        </b>
        <span className="pt-0.5 text-caption text-white/60 tabular-nums">
          {count}
        </span>
        <span className="col-span-full text-caption text-white/60">{why}</span>
      </div>
      {children}
    </div>
  );
}
