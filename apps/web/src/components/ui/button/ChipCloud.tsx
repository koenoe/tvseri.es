import { GHOST_FILL, GHOST_LOOK } from '@/components/ui/row/RowGhosts';
import cn from '@/lib/cn';

import { chipStyles } from './buttonStyles';
import ChipLink from './ChipLink';

export type CloudChip = Readonly<{
  /** its landing; without one it is a plain chip, dimmer than the linked ones */
  href?: string;
  key: string;
  label: string;
}>;

/** The cloud's chip: 38 tall, the label medium */
const CHIP = 'h-auto py-2 font-medium';

/** The cloud's line: chips 8 apart that wrap onto as many rows as they need */
const CLOUD = 'flex max-w-full flex-wrap gap-2';

/**
 * Keyword chips that wrap onto rows, never a swipe line: a show's keywords
 * (pd-kw) and a landing's chips (sub-genres, "Often tagged with"). A chip
 * with an `href` links to its landing; the rest stay plain, dimmer, so the
 * ones that lead somewhere stand out.
 */
export default function ChipCloud({
  chips,
  className,
  label,
  slot,
}: Readonly<{
  chips: ReadonlyArray<CloudChip>;
  /** placement only (margins, `self-start`) */
  className?: string;
  /** the list's accessible name */
  label?: string;
  /** `data-slot` */
  slot?: string;
}>) {
  const plain = chipStyles({
    className: `${CHIP} cursor-default text-white/60 hover:border-white/5`,
  });
  return (
    <ul aria-label={label} className={cn(CLOUD, className)} data-slot={slot}>
      {chips.map((chip) => (
        <li key={chip.key}>
          {chip.href ? (
            <ChipLink className={CHIP} href={chip.href}>
              {chip.label}
            </ChipLink>
          ) : (
            <span className={plain}>{chip.label}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

/**
 * The cloud's place while it loads (or `failed`, as dashed outlines): one
 * 38px ghost chip per width, so the rows break where the real chips' do.
 */
export function ChipCloudGhost({
  className,
  look = 'loading',
  name,
  widths,
}: Readonly<{
  /** placement only, as the cloud's */
  className?: string;
  look?: 'failed' | 'loading';
  /** `data-placeholder` */
  name?: string;
  /** a Tailwind width class per ghost chip */
  widths: ReadonlyArray<string>;
}>) {
  const loading = look === 'loading';
  const fill = loading ? GHOST_FILL : GHOST_LOOK.failed;
  return (
    <ul
      aria-hidden="true"
      className={cn(CLOUD, loading && 'animate-ghost', className)}
      data-placeholder={name}
    >
      {widths.map((width, index) => (
        <li className={cn('h-[38px] rounded-full', fill, width)} key={index} />
      ))}
    </ul>
  );
}
