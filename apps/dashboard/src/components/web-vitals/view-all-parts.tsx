import { CircleCheck } from 'lucide-react';

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { GroupedMetricData, MetricItem } from '@/lib/api/utils';
import { cn } from '@/lib/utils';
import {
  RATING_COLORS,
  type RatingStatus,
  STATUS_ICONS,
  STATUS_LABELS,
} from '@/lib/web-vitals';
import { MetricListItem } from './metric-list-item';

export type MetricItemWithStatus = MetricItem & { status: RatingStatus };

export type FilterValue = 'all' | RatingStatus;

const FILTER_ORDER: ReadonlyArray<RatingStatus> = [
  'great',
  'needsImprovement',
  'poor',
];

type ModalHeadingProps = Readonly<{
  activeFilter: FilterValue;
  data: GroupedMetricData;
  metricName: string;
  onFilterChange: (value: string) => void;
  title: string;
}>;

function StatusFilterItem({
  count,
  status,
}: Readonly<{ count: number; status: RatingStatus }>) {
  const Icon = STATUS_ICONS[status];
  const label = `${STATUS_LABELS[status]} (${count})`;
  const iconClasses = cn('size-4', RATING_COLORS[status].text);
  return (
    <ToggleGroupItem
      aria-label={label}
      className="size-8 p-0 last:rounded-r-lg!"
      size="sm"
      title={label}
      value={status}
    >
      <Icon className={iconClasses} />
    </ToggleGroupItem>
  );
}

StatusFilterItem.displayName = 'StatusFilterItem';

/** Title, metric name and the status filter, shared by the dialog and the drawer. */
export function ModalHeading({
  activeFilter,
  data,
  metricName,
  onFilterChange,
  title,
}: ModalHeadingProps) {
  return (
    <>
      <span>{title}</span>
      <span className="ml-auto text-sm font-normal text-muted-foreground leading-none">
        {metricName}
      </span>
      <ToggleGroup
        className="rounded-lg!"
        onValueChange={onFilterChange}
        type="single"
        value={activeFilter}
        variant="outline"
      >
        <ToggleGroupItem
          className="h-8 px-3 first:rounded-l-lg! last:rounded-r-lg!"
          size="sm"
          value="all"
        >
          All
        </ToggleGroupItem>
        {FILTER_ORDER.map((status) => (
          <StatusFilterItem
            count={data[status].length}
            key={status}
            status={status}
          />
        ))}
      </ToggleGroup>
    </>
  );
}

ModalHeading.displayName = 'ModalHeading';

export function ItemsList({
  items,
  variant,
}: Readonly<{
  items: ReadonlyArray<MetricItemWithStatus>;
  variant: 'country' | 'route';
}>) {
  return (
    <div className="overflow-y-auto flex-1 p-4">
      {items.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center gap-3">
          <CircleCheck className="size-8 text-muted-foreground" />
          <p className="text-muted-foreground">No scores found</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <MetricListItem
              id={item.id ?? item.label}
              key={item.label}
              label={item.label}
              pageViews={item.pageViews}
              StatusIcon={STATUS_ICONS[item.status]}
              statusColor={RATING_COLORS[item.status].text}
              value={item.value}
              variant={variant}
            />
          ))}
        </div>
      )}
    </div>
  );
}

ItemsList.displayName = 'ItemsList';
