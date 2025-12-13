import type { LucideIcon } from 'lucide-react';
import { memo } from 'react';

import type { RatingStatus } from '@/lib/web-vitals';

import { StatusHeader } from './status-header';
import { StatusList } from './status-list';

type StatusConfig = Readonly<{
  Icon: LucideIcon;
  label: string;
  text: string;
  threshold: string;
}>;

type MetricItem = Readonly<{
  label: string;
  value: number | string;
}>;

type MetricData = Readonly<{
  great: ReadonlyArray<MetricItem>;
  needsImprovement: ReadonlyArray<MetricItem>;
  poor: ReadonlyArray<MetricItem>;
}>;

type StatusColumnsProps = Readonly<{
  data: MetricData;
  emptyMessages?: Readonly<Record<RatingStatus, string>>;
  onViewAll?: (status: RatingStatus) => void;
  statusConfig: Readonly<Record<RatingStatus, StatusConfig>>;
  variant?: 'country' | 'route';
}>;

const COLUMN_ORDER: ReadonlyArray<RatingStatus> = [
  'poor',
  'needsImprovement',
  'great',
];

const COLUMN_PADDING: Record<RatingStatus, string> = {
  great: 'pl-6',
  needsImprovement: 'px-6',
  poor: 'pr-6',
};

const DEFAULT_EMPTY_MESSAGES: Record<RatingStatus, string> = {
  great: 'No great scores',
  needsImprovement: 'No needs improvement scores',
  poor: 'No poor scores',
};

function StatusColumnsComponent({
  data,
  emptyMessages,
  onViewAll,
  statusConfig,
  variant = 'route',
}: StatusColumnsProps) {
  return (
    <div className="hidden grid-cols-3 divide-x md:grid">
      {COLUMN_ORDER.map((status) => {
        const config = statusConfig[status];
        const items = data[status];
        const emptyMessage =
          emptyMessages?.[status] ?? DEFAULT_EMPTY_MESSAGES[status];
        const handleViewAll = onViewAll ? () => onViewAll(status) : undefined;

        return (
          <div
            className={`flex flex-col ${COLUMN_PADDING[status]}`}
            key={status}
          >
            <div className="mb-4 flex items-center justify-between">
              <StatusHeader
                Icon={config.Icon}
                label={config.label}
                textColorClass={config.text}
                threshold={config.threshold}
              />
            </div>
            <div className="relative h-64 overflow-hidden">
              <StatusList
                emptyMessage={emptyMessage}
                items={items}
                onViewAll={handleViewAll}
                variant={variant}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

StatusColumnsComponent.displayName = 'StatusColumns';
export const StatusColumns = memo(StatusColumnsComponent);
