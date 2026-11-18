import { memo, type ReactNode, useMemo } from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import {
  countFilledBars,
  type DependencyMetricItem,
  getErrorRateColor,
} from '@/lib/api-metrics';
import { getSharpSparklinePath, midline, toAreaPath } from '@/lib/sparkline';
import { STATUS_COLORS } from '@/lib/status-colors';
import { DependencyErrorPopover } from './dependency-popovers';
import {
  AreaSparkline,
  CardMenuButton,
  ChartSlot,
  DisabledCardMenuButton,
  MetricCard,
  MetricCardSkeleton,
  MetricValue,
} from './metric-card';
import { SegmentedBar } from './segmented-bar';

const BAR_COUNT = 32;
const OPEN_MENU_CLASSES =
  'text-muted-foreground cursor-pointer data-[state=open]:bg-muted';

type ErrorRateSeriesItem = Readonly<{
  date: string;
  errorRate?: number;
}>;

type ErrorRateCardProps = Readonly<{
  /** Replaces the dependency popover; `null` shows a disabled menu. */
  action?: ReactNode;
  dependencies?: ReadonlyArray<DependencyMetricItem>;
  errorRate: number;
  series?: ReadonlyArray<ErrorRateSeriesItem>;
}>;

const ErrorRateCard = memo(function ErrorRateCard({
  action,
  dependencies,
  errorRate,
  series,
}: ErrorRateCardProps) {
  const color = getErrorRateColor(errorRate);
  const filledBars = countFilledBars(errorRate, BAR_COUNT);

  // Without variation the line sits mid-height instead of on the floor.
  const sparkline = useMemo(() => {
    if (!series || series.length === 0) return null;

    const errorRates = series.map((s) => s.errorRate ?? 0);
    const hasVariation = errorRates.some((r) => r !== errorRates[0]);
    const linePath = hasVariation
      ? getSharpSparklinePath(errorRates, 200, 100)
      : midline(200, 100);

    return { areaPath: toAreaPath(linePath, 200, 100), linePath };
  }, [series]);

  const strokeColor = STATUS_COLORS[color].hsl;
  const menu =
    action === null ? (
      <DisabledCardMenuButton />
    ) : (
      (action ?? (
        <DependencyErrorPopover dependencies={dependencies}>
          <CardMenuButton className={OPEN_MENU_CLASSES} />
        </DependencyErrorPopover>
      ))
    );

  return (
    <MetricCard
      action={menu}
      description="Percentage of Failed Requests"
      title="Error Rate"
    >
      <MetricValue className="tabular-nums" unit="%">
        {errorRate.toFixed(2)}
      </MetricValue>
      <ChartSlot className="items-center">
        {sparkline ? (
          <AreaSparkline
            areaPath={sparkline.areaPath}
            color={strokeColor}
            linePath={sparkline.linePath}
            strokeLinecap="square"
            strokeLinejoin="miter"
          />
        ) : (
          <SegmentedBar
            barCount={BAR_COUNT}
            color={color}
            filledBars={filledBars}
          />
        )}
      </ChartSlot>
    </MetricCard>
  );
});

ErrorRateCard.displayName = 'ErrorRateCard';

const SKELETON_VALUE = (
  <>
    0.00<span className="text-[0.4em] font-light ml-1">%</span>
  </>
);
const SKELETON_CHART = (
  <Skeleton className="h-full w-full max-w-60 rounded-none" />
);

function ErrorRateCardSkeleton() {
  return (
    <MetricCardSkeleton
      chart={SKELETON_CHART}
      chartSlotClassName="items-center"
      descriptionWidth="w-44"
      titleWidth="w-24"
      value={SKELETON_VALUE}
    />
  );
}

ErrorRateCardSkeleton.displayName = 'ErrorRateCardSkeleton';

export { ErrorRateCard, ErrorRateCardSkeleton };
