import { circleButtonStyles } from '@/components/ui/button/buttonStyles';
import { chevronDownGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import cn from '@/lib/cn';

/** The chevron turns over while the row is open */
const TURN =
  'transition-transform duration-200 ease-[cubic-bezier(.2,.8,.2,1)]';
const PHONE_TURN = `${TURN} md:hidden [[aria-expanded=true]>&]:rotate-180`;

/**
 * A run's 32px chevron circle at the row's end, desktop only: it
 * shows the toggle's state; the toggle's hit area under it takes the click
 * (so it lets the pointer through and brightens with the row's hover).
 */
export function RunChevron({ open }: Readonly<{ open: boolean }>) {
  const classes = circleButtonStyles({
    className:
      'pointer-events-none text-white group-hover/row:border-white/45 max-md:hidden',
    size: 32,
  });
  const icon = cn(TURN, open && 'rotate-180');
  return (
    <span aria-hidden="true" className={classes}>
      <Icon className={icon} glyph={chevronDownGlyph} size={16} />
    </span>
  );
}

/**
 * "3 episodes" (a pill on a phone): the row's disclosure, in the code
 * line. On a desktop it reads as the line's text
 * and the row's chevron circle (`RunChevron`) shows the state; on a phone
 * it is a pill with its own chevron. Its hit area covers the whole row (a
 * click anywhere opens the row); the ⋯ and a tag sit above it.
 */
export default function CountToggle({
  controls,
  count,
  onToggle,
  open,
  show,
}: Readonly<{
  controls: string;
  count: number;
  onToggle: () => void;
  open: boolean;
  show: string;
}>) {
  const label = `${count} episodes of ${show}`;
  return (
    <button
      aria-controls={controls}
      aria-expanded={open}
      aria-label={label}
      className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap after:absolute after:inset-0 max-md:h-6 max-md:rounded-full max-md:bg-white/8 max-md:pr-1.5 max-md:pl-2.5 max-md:text-caption max-md:font-semibold max-md:text-white"
      onClick={onToggle}
      type="button"
    >
      {count} episodes
      <Icon className={PHONE_TURN} glyph={chevronDownGlyph} size={16} />
    </button>
  );
}
