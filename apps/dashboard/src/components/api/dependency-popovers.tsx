import { memo, type ReactNode } from 'react';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Sparkline } from '@/components/ui/sparkline';
import {
  countFilledBars,
  type DependencyMetricItem,
  formatCountString,
  formatLatency,
  getErrorRateColor,
  getLatencyColor,
} from '@/lib/api-metrics';
import { NEUTRAL_COLOR, STATUS_COLORS } from '@/lib/status-colors';
import { DependencyBadge } from './dependency-badge';
import { SegmentedBar } from './segmented-bar';

const BAR_COUNT = 16;

type DependencyPopoverProps = Readonly<{
  children: ReactNode;
  dependencies?: ReadonlyArray<DependencyMetricItem>;
}>;

type DependencyListPopoverProps = DependencyPopoverProps &
  Readonly<{ renderMetric: (dependency: DependencyMetricItem) => ReactNode }>;

/** Lists each dependency with one metric; without dependencies the trigger stays inert. */
function DependencyListPopover({
  children,
  dependencies,
  renderMetric,
}: DependencyListPopoverProps) {
  if (!dependencies || dependencies.length === 0) {
    return <>{children}</>;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align="end" className="w-auto">
        <div className="flex flex-col gap-3 p-3">
          {dependencies.map((dep) => (
            <div
              className="flex items-center justify-between gap-4"
              key={dep.source}
            >
              <DependencyBadge
                linkable
                name={dep.sourceName}
                source={dep.source}
              />
              <div className="flex items-center gap-4">{renderMetric(dep)}</div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

DependencyListPopover.displayName = 'DependencyListPopover';

function HistorySparkline({
  color,
  dependency,
}: Readonly<{ color: string; dependency: DependencyMetricItem }>) {
  const { history } = dependency;
  if (!history || history.length <= 1) return null;
  const points = history.map((point) => point.value);
  return (
    <Sparkline
      className="h-5 w-16"
      color={color}
      data={points}
      height={20}
      strokeWidth={1.2}
      width={64}
    />
  );
}

HistorySparkline.displayName = 'HistorySparkline';

function renderErrorRate(dep: DependencyMetricItem) {
  const color = getErrorRateColor(dep.errorRate);
  const filledBars = countFilledBars(dep.errorRate, BAR_COUNT);
  return (
    <>
      <span className="text-sm tabular-nums text-muted-foreground">
        {dep.errorRate.toFixed(2)}%
      </span>
      <SegmentedBar
        barCount={BAR_COUNT}
        color={color}
        filledBars={filledBars}
        height="h-3"
        width="w-16"
      />
    </>
  );
}

function renderLatency(dep: DependencyMetricItem) {
  const color = STATUS_COLORS[getLatencyColor(dep.latency.p75)].hsl;
  return (
    <>
      <span className="text-sm tabular-nums text-muted-foreground">
        {formatLatency(dep.latency.p75)}
      </span>
      <HistorySparkline color={color} dependency={dep} />
    </>
  );
}

function renderRequests(dep: DependencyMetricItem) {
  return (
    <>
      <span className="text-sm tabular-nums text-muted-foreground">
        {formatCountString(dep.latency.count)}
      </span>
      <HistorySparkline color={NEUTRAL_COLOR} dependency={dep} />
    </>
  );
}

const DependencyErrorPopover = memo(function DependencyErrorPopover(
  props: DependencyPopoverProps,
) {
  return <DependencyListPopover {...props} renderMetric={renderErrorRate} />;
});

DependencyErrorPopover.displayName = 'DependencyErrorPopover';

const DependencyLatencyPopover = memo(function DependencyLatencyPopover(
  props: DependencyPopoverProps,
) {
  return <DependencyListPopover {...props} renderMetric={renderLatency} />;
});

DependencyLatencyPopover.displayName = 'DependencyLatencyPopover';

const DependencyRequestsPopover = memo(function DependencyRequestsPopover(
  props: DependencyPopoverProps,
) {
  return <DependencyListPopover {...props} renderMetric={renderRequests} />;
});

DependencyRequestsPopover.displayName = 'DependencyRequestsPopover';

export {
  DependencyErrorPopover,
  DependencyLatencyPopover,
  DependencyRequestsPopover,
};
