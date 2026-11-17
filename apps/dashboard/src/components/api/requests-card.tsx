import { memo, type ReactNode, useMemo } from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import { type DependencyMetricItem, formatCount } from '@/lib/api-metrics';
import { getSmoothSparklinePath, toAreaPath } from '@/lib/sparkline';
import { NEUTRAL_COLOR } from '@/lib/status-colors';
import { DependencyRequestsPopover } from './dependency-popovers';
import {
  AreaSparkline,
  CardMenuButton,
  ChartSlot,
  DisabledCardMenuButton,
  MetricCard,
  MetricCardSkeleton,
  MetricValue,
} from './metric-card';

const formatRpm = (rpm: number): string => {
  return `~${Math.round(rpm)}/min avg`;
};

type RequestsCardProps = Readonly<{
  /** Replaces the dependency popover; `null` shows a disabled menu. */
  action?: ReactNode;
  dependencies?: ReadonlyArray<DependencyMetricItem>;
  requestCount: number;
  series: ReadonlyArray<{
    date: string;
    requestCount: number;
  }>;
  throughput: number;
}>;

const RequestsCard = memo(function RequestsCard({
  action,
  dependencies,
  requestCount,
  series,
  throughput,
}: RequestsCardProps) {
  const { areaPath, linePath } = useMemo(() => {
    const points = series.map((s) => s.requestCount);
    const line = getSmoothSparklinePath(points, 200, 100);
    const area = points.length > 0 ? toAreaPath(line, 200, 100) : '';
    return { areaPath: area, linePath: line };
  }, [series]);

  const { unit, value } = formatCount(requestCount);
  const description = formatRpm(throughput);
  const menu =
    action === null ? (
      <DisabledCardMenuButton />
    ) : (
      (action ?? (
        <DependencyRequestsPopover dependencies={dependencies}>
          <CardMenuButton />
        </DependencyRequestsPopover>
      ))
    );

  return (
    <MetricCard action={menu} description={description} title="Requests">
      <MetricValue unit={unit}>{value}</MetricValue>
      <ChartSlot>
        <AreaSparkline
          areaPath={areaPath}
          color={NEUTRAL_COLOR}
          linePath={linePath}
        />
      </ChartSlot>
    </MetricCard>
  );
});

RequestsCard.displayName = 'RequestsCard';

const SKELETON_VALUE = (
  <>
    00.0<span className="text-[0.4em] font-light ml-1">k</span>
  </>
);
const SKELETON_CHART = (
  <Skeleton className="h-full w-full max-w-60 rounded-sm" />
);

function RequestsCardSkeleton() {
  return (
    <MetricCardSkeleton
      chart={SKELETON_CHART}
      descriptionWidth="w-16"
      menuSize="icon-xs"
      titleWidth="w-20"
      value={SKELETON_VALUE}
    />
  );
}

RequestsCardSkeleton.displayName = 'RequestsCardSkeleton';

export { RequestsCard, RequestsCardSkeleton };
