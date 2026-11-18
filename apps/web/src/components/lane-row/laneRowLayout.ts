import type { CodeBadgeSize } from '@/components/ui/button/CodeBadge';

/**
 * A lane row's look at one place (Home's In progress, the profile's Almost
 * done and Out now): plain class strings the row (`LaneRow`) and its
 * placeholder (`LaneRowGhost`) are drawn with, so the ghost sits where the
 * row lands. Each place defines its own next to its row. A plain module:
 * server-rendered rows and placeholders read these as strings.
 */
export type LaneRowLayout = Readonly<{
  row: string;
  /** The text column; its gap spaces the title, the segments and the meta line */
  text: string;
  /** The text column's element where it isn't a `div` (Out now's rows draw a `span`) */
  textAs?: 'span';
  /** The title's type (and its hover, where it is a link) */
  title: string;
  /** The line of the title and the count; left out, the title stands alone */
  titleLine?: string;
  /** The count beside the title ("1 to go") */
  count?: string;
  /** The count again in the meta line, where the title line hides it (phones) */
  countInMeta?: string;
  /** The meta line under the segments: the code badge, then the place's facts */
  meta: string;
  /** `drop`: facts that don't fit drop whole (`MetaRow`'s `fit`) */
  metaFit?: 'drop';
  code: CodeBadgeSize;
}>;

/** A lane row's placeholder at one place: its box and its segments' fill */
export type LaneRowGhostLayout = Readonly<{
  row: string;
  /** One empty segment (8 are drawn); left out, no segments */
  segment?: string;
}>;
