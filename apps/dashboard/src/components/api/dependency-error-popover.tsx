import { memo } from 'react';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  countFilledBars,
  type DependencyMetricItem,
  getErrorRateColor,
} from '@/lib/api-metrics';
import { DependencyBadge } from './dependency-badge';
import { SegmentedBar } from './segmented-bar';

const BAR_COUNT = 16;

type DependencyErrorPopoverProps = Readonly<{
  children: React.ReactNode;
  dependencies?: ReadonlyArray<DependencyMetricItem>;
}>;

type ErrorRateVisualizationProps = Readonly<{
  errorRate: number;
}>;

function ErrorRateVisualization({ errorRate }: ErrorRateVisualizationProps) {
  const color = getErrorRateColor(errorRate);
  const filledBars = countFilledBars(errorRate, BAR_COUNT);

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
                <ErrorRateVisualization errorRate={dep.errorRate} />
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
