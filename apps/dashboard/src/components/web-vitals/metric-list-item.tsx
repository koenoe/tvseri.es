import { memo } from 'react';

type MetricListItemProps = Readonly<{
  label: string;
  value: number | string;
  variant?: 'country' | 'route';
}>;

function MetricListItemComponent({
  label,
  value,
  variant = 'route',
}: MetricListItemProps) {
  const isRoute = variant === 'route';

  return (
    <div
      className={`flex items-center justify-between gap-4${isRoute ? '' : ' px-2'}`}
    >
      <span
        className={
          isRoute
            ? 'truncate rounded bg-muted/50 px-2 py-1 font-mono text-xs text-muted-foreground'
            : 'truncate text-sm text-muted-foreground'
        }
      >
        {label}
      </span>
      <span className="shrink-0 font-medium">{value}</span>
    </div>
  );
}

MetricListItemComponent.displayName = 'MetricListItem';
export const MetricListItem = memo(MetricListItemComponent);
