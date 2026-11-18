import { Ghost } from '@/components/ui/ghost/ghosts';
import cn from '@/lib/cn';

/**
 * The three meta lines' ghost (17px each), for each place's own placeholder;
 * `className` is the place's pulse when its block does not pulse as a whole
 */
export default function IdentityLinesGhost({
  className,
}: Readonly<{ className?: string }>) {
  const classes = cn('flex flex-col gap-3', className);
  return (
    <div className={classes}>
      <Ghost className="h-[17px] w-44 rounded-4" />
      <Ghost className="h-[17px] w-52 rounded-4" />
      <Ghost className="h-[17px] w-48 rounded-4" />
    </div>
  );
}
