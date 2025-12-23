import { memo } from 'react';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { DependencyMetricItem } from '@/lib/api-metrics';
import { DependencyBadge } from './dependency-badge';
import { SegmentedBar, type StatusColor } from './segmented-bar';

const BAR_COUNT = 16;
const MAX_ERROR_RATE = 10;

type DependencyErrorPopoverProps = Readonly<{
  children: React.ReactNode;
  dependencies?: ReadonlyArray<DependencyMetricItem>;
}>;

function getErrorRateColor(errorRate: number): StatusColor {
  if (errorRate < 1) return 'green';
  if (errorRate < 5) return 'amber';
  return 'red';
}

function ErrorRateBar({ errorRate }: Readonly<{ errorRate: number }>) {
  const color = getErrorRateColor(errorRate);
  const filledBars = Math.round(
    (Math.min(errorRate, MAX_ERROR_RATE) / MAX_ERROR_RATE) * BAR_COUNT,
  );

  return (
    <SegmentedBar
      barCount={BAR_COUNT}
      color={color}
      filledBars={filledBars}
      height="h-3"
      width="w-16"
    />
  );
}

const DependencyErrorPopover = memo(function DependencyErrorPopover({
  children,
  dependencies,
}: DependencyErrorPopoverProps) {
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
              <div className="flex items-center gap-4">
                <span className="text-sm tabular-nums text-muted-foreground">
                  {dep.errorRate.toFixed(2)}%
                </span>
                <ErrorRateBar errorRate={dep.errorRate} />
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
});

DependencyErrorPopover.displayName = 'DependencyErrorPopover';

export { DependencyErrorPopover };
