import { CircleCheck } from 'lucide-react';
import { memo } from 'react';

import type { MetricItem } from '@/lib/api/utils';

import { MetricListItem } from './metric-list-item';
import { ViewAllOverlay } from './view-all-overlay';

type StatusListProps = Readonly<{
  emptyMessage?: string;
  highlightedItem?: string | null;
  items: ReadonlyArray<MetricItem>;
  onItemHover?: (label: string | null) => void;
  onViewAll?: () => void;
  variant?: 'country' | 'route';
}>;

function StatusListComponent({
  emptyMessage = 'No scores',
  highlightedItem,
  items,
  onItemHover,
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
      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <MetricListItem
            isHighlighted={highlightedItem === item.label}
            key={item.label}
            label={item.label}
            onMouseEnter={
              onItemHover ? () => onItemHover(item.label) : undefined
            }
            onMouseLeave={onItemHover ? () => onItemHover(null) : undefined}
            pageViews={item.pageViews}
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
