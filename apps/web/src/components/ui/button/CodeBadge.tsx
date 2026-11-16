import cn from '@/lib/cn';

import Badge from './Badge';

/**
 * The episode code badge's box per place. Each place keeps its signed-off
 * look (owner, 15 Nov 2026); unify only with his approval.
 */
const CODE_BADGE_SIZE = {
  /** Home's In progress rows (HMFinal `hx-d`: 20 × 50, 7px in) */
  home: 'h-5 min-w-12.5',
  /** The profile's Coming up tickets, the season ledger, Settings' Plex card and its list of marks: 20 × 50 */
  lane: 'h-5 min-w-[50px] shrink-0',
  /** A 22px meta line: Out now, Paused, history, a visitor's rows */
  meta: 'h-[22px] min-w-[54px]',
} as const;

export type CodeBadgeSize = keyof typeof CODE_BADGE_SIZE;

/**
 * An episode or season code (`S04E02`) in a row's meta line, at its place's
 * size. Without `code` it is the badge's empty box (a placeholder passes
 * `FLAT` as `className`).
 *
 * @example
 * <CodeBadge code="S04E02" size="meta" />
 * <CodeBadge className={FLAT} size="lane" />
 */
export default function CodeBadge({
  className,
  code,
  size,
}: Readonly<{ className?: string; code?: string; size: CodeBadgeSize }>) {
  const classes = cn(CODE_BADGE_SIZE[size], className);
  return (
    <Badge className={classes} variant="code">
      {code}
    </Badge>
  );
}
