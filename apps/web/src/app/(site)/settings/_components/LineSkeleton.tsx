import { GHOST_FILL } from '@/components/ui/row/RowGhosts';
import cn from '@/lib/cn';

/**
 * A placeholder for one streamed line of text: a bar centred in the line box
 * of the text it stands in for, so nothing moves when the text arrives.
 */
export default function LineSkeleton({
  className,
}: Readonly<{ className?: string }>) {
  const classes = cn(
    'inline-block h-[0.7em] w-32 max-w-full animate-ghost rounded-4 align-middle',
    GHOST_FILL,
    className,
  );
  return <span aria-hidden="true" className={classes} />;
}
