import { twMerge } from 'tailwind-merge';

import { ClockOutlineIcon } from '@/components/Icons/ClockOutlineIcon';
import formatRuntime from '@/utils/formatRuntime';

/** An episode's runtime; it always comes with the clock icon */
export default function Runtime({
  className,
  minutes,
}: Readonly<{
  className?: string;
  minutes: number;
}>) {
  const classes = twMerge('flex items-center gap-1.5 text-nowrap', className);

  return (
    <span className={classes}>
      <ClockOutlineIcon className="size-3.5 flex-shrink-0" />
      {formatRuntime(minutes)}
    </span>
  );
}
