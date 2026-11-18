import type { ReactNode } from 'react';

import Badge from '@/components/ui/button/Badge';
import cn from '@/lib/cn';

/** The heading's row, rule and title: a placeholder that mirrors it draws the same */
export const SECTION_HEAD_ROW = 'flex items-center gap-3.5';
export const SECTION_RULE = 'ml-1.5 h-0.5 flex-1 rounded-2 bg-white/8';
export const SECTION_TITLE = 'whitespace-nowrap text-title-2';

/** One place's look for the heading: its row, its title and its rule */
export type SectionHeadLayout = Readonly<{
  row: string;
  rule: string;
  title: string;
}>;

const MAIN: SectionHeadLayout = {
  row: SECTION_HEAD_ROW,
  rule: SECTION_RULE,
  title: SECTION_TITLE,
};

/**
 * A section heading with a rule: an optional leading mark (the profile's
 * block dot), the title, an optional count pill, a 2px rule that fills the
 * row, then an optional end slot (a link, a count, a control). `size="side"` is the sidebars' title-3.
 */
export default function SectionHead({
  className,
  count,
  id,
  layout = MAIN,
  leading,
  link,
  size = 'main',
  title,
}: Readonly<{
  className?: string;
  /**
   * the count right after the title ("Series 67"): a number is drawn as the
   * pill, a node as given
   */
  count?: ReactNode;
  id: string;
  /** a place's own spacing and title (each keeps its own look) */
  layout?: SectionHeadLayout;
  /** before the title: the profile's block dot */
  leading?: ReactNode;
  /** after the rule */
  link?: ReactNode;
  size?: 'main' | 'side';
  title: ReactNode;
}>) {
  const rowClass = cn(layout.row, className);
  const titleClass =
    size === 'side' ? 'whitespace-nowrap text-title-3' : layout.title;
  return (
    <div className={rowClass}>
      {leading}
      <h2 className={titleClass} id={id}>
        {title}
      </h2>
      {typeof count === 'number' ? (
        <Badge variant="count">{count}</Badge>
      ) : (
        count
      )}
      <span aria-hidden="true" className={layout.rule} />
      {link}
    </div>
  );
}
