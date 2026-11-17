import type { GroupedMetricData } from '@/lib/api/utils';
import type { RatingStatus, StatusConfig } from '@/lib/web-vitals';
import { StatusAccordion } from './status-accordion';
import { StatusColumns } from './status-columns';

type RoutesSectionProps = Readonly<{
  /** Remounts the accordion so it opens on the current status again. */
  accordionKey: string;
  currentStatus: RatingStatus;
  metricName: string;
  onViewAll: (status: RatingStatus) => void;
  routesGrouped: GroupedMetricData;
  statusConfig: Readonly<Record<RatingStatus, StatusConfig>>;
}>;

/** Columns on wide screens, an accordion on narrow ones. */
export function RoutesSection({
  accordionKey,
  currentStatus,
  metricName,
  onViewAll,
  routesGrouped,
  statusConfig,
}: RoutesSectionProps) {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold">Routes</h3>
        <span className="text-sm text-muted-foreground leading-normal">
          {metricName}
        </span>
      </div>
      <StatusColumns
        data={routesGrouped}
        onViewAll={onViewAll}
        statusConfig={statusConfig}
        variant="route"
      />
      <StatusAccordion
        className="rounded-lg border lg:hidden"
        data={routesGrouped}
        defaultStatus={currentStatus}
        key={accordionKey}
        onViewAll={onViewAll}
        statusConfig={statusConfig}
        variant="route"
      />
    </div>
  );
}

RoutesSection.displayName = 'RoutesSection';
