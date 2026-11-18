import cn from '@/lib/cn';

/** The bar's caption, "**1 of 8 watched** · 1 to watch" */
export default function UpNextCaption({
  className,
  lead,
  rest,
}: Readonly<{ className?: string; lead: string; rest: string }>) {
  const classes = cn(
    'shrink-0 whitespace-nowrap text-caption text-white/60 tabular-nums',
    className,
  );
  return (
    <span className={classes}>
      <b className="font-medium text-white/80">{lead}</b> · {rest}
    </span>
  );
}
