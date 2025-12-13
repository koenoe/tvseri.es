import { CircleCheck } from 'lucide-react';
import { memo } from 'react';

import { MetricListItem } from './metric-list-item';
import { ViewAllOverlay } from './view-all-overlay';

type MetricItem = Readonly<{
  label: string;
  value: number | string;
}>;

type StatusListProps = Readonly<{
  emptyMessage?: string;
  items: ReadonlyArray<MetricItem>;
  onViewAll?: () => void;
  variant?: 'country' | 'route';
}>;

function StatusListComponent({
  emptyMessage = 'No scores',
  items,
  onViewAll,
  variant = 'route',
}: StatusListProps) {
  if (items.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <CircleCheck className="size-8 text-muted-foreground" />
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <MetricListItem
            key={item.label}
            label={item.label}
            value={item.value}
            variant={variant}
          />
        ))}
      </div>
      <ViewAllOverlay onClick={onViewAll} />
    </>
  );
}

StatusListComponent.displayName = 'StatusList';
export const StatusList = memo(StatusListComponent);
