import { memo, type ReactNode, useMemo } from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import { type DependencyMetricItem, getLatencyColor } from '@/lib/api-metrics';
import { getSmoothSparklinePath, toAreaPath } from '@/lib/sparkline';
import { STATUS_COLORS } from '@/lib/status-colors';
import { DependencyLatencyPopover } from './dependency-popovers';
import {
  AreaSparkline,
  CardMenuButton,
  ChartSlot,
  MetricCard,
  MetricCardSkeleton,
  MetricValue,
} from './metric-card';

type LatencyCardProps = Readonly<{
  action?: ReactNode;
  dependencies?: ReadonlyArray<DependencyMetricItem>;
  p75: number;
  series: ReadonlyArray<{
    date: string;
    latency: {
      p75: number;
    };
  }>;
}>;

const LatencyCard = memo(function LatencyCard({
  action,
  dependencies,
  p75,
  series,
}: LatencyCardProps) {
  const color = STATUS_COLORS[getLatencyColor(p75)].hsl;

  const { areaPath, linePath } = useMemo(() => {
    const points = series.map((s) => s.latency.p75);
    const line = getSmoothSparklinePath(points, 200, 100);
    const area = points.length > 0 ? toAreaPath(line, 200, 100) : '';
    return { areaPath: area, linePath: line };
  }, [series]);

  const isMilliseconds = p75 < 1000;
  const value = isMilliseconds ? Math.round(p75) : (p75 / 1000).toFixed(2);
  const unit = isMilliseconds ? 'ms' : 's';
  const menu = action ?? (
    <DependencyLatencyPopover dependencies={dependencies}>
      <CardMenuButton />
    </DependencyLatencyPopover>
  );

  return (
    <MetricCard
      action={menu}
      description="75th Percentile Response Time"
      title="Latency"
    >
      <MetricValue unit={unit}>{value}</MetricValue>
      <ChartSlot>
        <AreaSparkline areaPath={areaPath} color={color} linePath={linePath} />
      </ChartSlot>
    </MetricCard>
  );
});

LatencyCard.displayName = 'LatencyCard';

const SKELETON_VALUE = (
  <>
    000<span className="text-[0.4em] font-light ml-1">ms</span>
  </>
);
const SKELETON_CHART = (
  <Skeleton className="h-full w-full max-w-60 rounded-sm" />
);

function LatencyCardSkeleton() {
  return (
    <MetricCardSkeleton
      chart={SKELETON_CHART}
      descriptionWidth="w-48"
      titleWidth="w-28"
      value={SKELETON_VALUE}
    />
  );
}

LatencyCardSkeleton.displayName = 'LatencyCardSkeleton';

export { LatencyCard, LatencyCardSkeleton };
