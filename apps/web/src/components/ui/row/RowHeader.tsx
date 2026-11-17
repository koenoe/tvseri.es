import Link from 'next/link';
import type { ReactNode } from 'react';

import { chevronRightGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import type { Glyph } from '@/components/ui/icon/types';

export type RowHeading = Readonly<{
  /** controls before the arrows, pushed to the end with them ("All 244 shows") */
  actions?: ReactNode;
  /** a number after the title, e.g. the watchlist's 42 */
  count?: number;
  /** only when the row has a page to go to (home rows have none) */
  seeAllHref?: string;
  /** one plain line after the title, e.g. "Loved by the few who found them"; desktop only: phones have no room for it */
  subtitle?: string;
  /** the 13px line icon before the subtitle */
  subtitleGlyph?: Glyph;
  title: string;
  /** what the h2 shows instead of the plain title (a logo + "Essentials", a link); `title` still names the arrows */
  titleContent?: ReactNode;
}>;

type Props = RowHeading &
  Readonly<{
    /** the arrows island, pushed to the end of the line */
    children?: ReactNode;
    /** desktop only, after the subtitle: e.g. the "You've seen 3 of 6" line */
    note?: ReactNode;
    /** desktop only, right after the title: a row switch */
    switcher?: ReactNode;
    titleId: string;
  }>;

/**
 * Title (title-2), then the optional count, subtitle and "See all ›", then
 * the arrows. One line whose box is the title's line box: the 40px arrows
 * overflow it (−6px), so title-2 → cards is the rhythm's 24.
 */
export default function RowHeader({
  actions,
  children,
  count,
  note,
  seeAllHref,
  subtitle,
  subtitleGlyph,
  switcher,
  title,
  titleContent,
  titleId,
}: Props) {
  return (
    <div className="flex min-h-[var(--row-head-h,auto)] items-center gap-2.5 pr-(--row-end) pl-(--row-start) md:gap-[var(--row-head-gap,20px)]">
      <h2
        className="min-w-0 truncate text-title-2 text-white"
        id={titleId}
        title={titleContent ? undefined : title}
      >
        {titleContent ?? title}
      </h2>
      {switcher ? (
        // 8 more after the title's gap
        <div className="ml-2 shrink-0 max-md:hidden">{switcher}</div>
      ) : null}
      {count === undefined ? null : (
        <span className="shrink-0 text-body-sm font-medium text-white/60 tabular-nums">
          {count}
        </span>
      )}
      {subtitle ? (
        <span className="flex min-w-0 items-center gap-1.5 text-body-sm text-white/60 max-md:hidden">
          {subtitleGlyph ? (
            <Icon
              className="size-[var(--row-meta-icon,13px)] shrink-0"
              glyph={subtitleGlyph}
              size={13}
            />
          ) : null}
          <span className="truncate">{subtitle}</span>
        </span>
      ) : null}
      {note ? (
        <span className="flex min-w-0 items-center gap-1.5 text-body-sm text-white/60 max-md:hidden">
          {note}
        </span>
      ) : null}
      {seeAllHref ? (
        <Link
          aria-describedby={titleId}
          className="-my-2.5 inline-flex shrink-0 items-center gap-1 rounded-6 py-2.5 text-body-sm font-medium whitespace-nowrap text-white/60 transition-colors hover:text-white max-md:ml-auto"
          href={seeAllHref}
        >
          See all
          <Icon className="max-md:hidden" glyph={chevronRightGlyph} size={13} />
        </Link>
      ) : null}
      {actions ? (
        <span className="ml-auto flex shrink-0 items-center gap-3.5">
          {actions}
          {children}
        </span>
      ) : (
        children
      )}
    </div>
  );
}
