import cn from '@/lib/cn';

/**
 * The ↵ chip on the marked option: the remote's letter chip in its white
 * “on a key” variant; over an image it adds a soft shadow so it keeps an
 * edge on pale posters. Hidden on touch, like the remote's letters.
 */
export default function EnterChip({
  className,
  overImage = false,
}: Readonly<{ className?: string; overImage?: boolean }>) {
  const classes = cn(
    'remote-chip pointer-coarse:hidden',
    overImage && 'shadow-[0_1px_3px_rgb(0_0_0/0.24)]',
    className,
  );
  return (
    <span aria-hidden="true" className={classes}>
      ↵
    </span>
  );
}
