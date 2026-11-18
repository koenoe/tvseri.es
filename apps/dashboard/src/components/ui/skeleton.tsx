import { cn } from '@/lib/utils';

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  const classes = cn('bg-muted rounded-xl animate-pulse', className);
  return <div className={classes} data-slot="skeleton" {...props} />;
}

export { Skeleton };
