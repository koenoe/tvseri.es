import type { ReactNode } from 'react';

import Badge from '@/components/ui/button/Badge';
import cn from '@/lib/cn';

/** The heading's row, rule and title: a placeholder that mirrors it draws the same */
export const SECTION_HEAD_ROW = 'flex items-center gap-3.5';
/** Where the rule sits in the row: its slot, not the line (`SectionRule` draws that) */
export const SECTION_RULE = 'ml-1.5 flex-1';
export const SECTION_TITLE = 'whitespace-nowrap text-title-2';

/** One place's look for the heading: its row, its title and its rule's slot */
export type SectionHeadLayout = Readonly<{
  row: string;
  /** the rule's slot: spacing and flex, not the line */
  rule: string;
  title: string;
}>;

/**
 * The heading's 2px rule. Its slot is a size container so a rule squeezed
 * under 24px (a long title and a link in a sidebar) drops out instead of
 * leaving a stub; CSS only, no measuring.
 */
export function SectionRule({ className }: Readonly<{ className: string }>) {
  const slot = cn('@container', className);
  return (
    <span aria-hidden="true" className={slot}>
      <span className="block h-0.5 rounded-2 bg-white/8 @max-[24px]:hidden" />
    </span>
  );
}

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
      <SectionRule className={layout.rule} />
      {link}
    </div>
  );
}
