import type { WebVitalRatings } from '@tvseri.es/schemas';
import { cva } from 'class-variance-authority';
import { memo, useState } from 'react';

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  getMetricStatus,
  METRICS_CONFIG,
  type MetricType,
  type RatingStatus,
  STATUS_COLORS,
} from '@/lib/web-vitals';

type PercentileBarProps = Readonly<{
  metric: MetricType;
  p75Value: number;
  ratings: WebVitalRatings;
  variant?: PercentileBarVariant;
}>;

type PercentileBarVariant = 'normal' | 'compact';

type ZoneData = Readonly<{
  color: string;
  percentage: number;
  status: RatingStatus;
  tooltipLabel: string;
}>;

const barVariants = cva('flex w-full space-x-0.5', {
  defaultVariants: { variant: 'normal' satisfies PercentileBarVariant },
  variants: {
    variant: {
      compact: 'h-0.75',
      normal: 'h-1',
    },
  },
});

const markerVariants = cva('absolute w-0.5 -translate-x-1/2', {
  defaultVariants: { variant: 'normal' satisfies PercentileBarVariant },
  variants: {
    variant: {
      compact: 'top-1/2 h-2 -translate-y-1/2',
      normal: '-top-1/2 h-2',
    },
  },
});

/**
 * Get grey shade based on zone status.
 * Poor = darkest, needs improvement = medium, good = lightest.
 * Subtle differences to match Vercel's design.
 */
function getGreyShade(status: RatingStatus): string {
  if (status === 'poor') return 'bg-muted-foreground/20';
  if (status === 'needsImprovement') return 'bg-muted-foreground/60';
  return 'bg-muted-foreground/40';
}

function PercentileBarComponent({
  metric,
  p75Value,
  ratings,
  variant = 'normal',
}: PercentileBarProps) {
  const [hoveredZone, setHoveredZone] = useState<RatingStatus | null>(null);

  const metricConfig = METRICS_CONFIG[metric];
  const totalRatings = ratings.good + ratings.needsImprovement + ratings.poor;

  // Active zone is determined by the actual P75 value against metric thresholds
  const p75Status = getMetricStatus(metric, p75Value);
  const activeZone: RatingStatus = p75Status;

  // If no ratings data, show 100% in the zone matching the p75 status
  const hasRatingsData = totalRatings > 0;

  const zones: ZoneData[] = [
    {
      color: STATUS_COLORS.great.bg,
      percentage: hasRatingsData
        ? (ratings.good / totalRatings) * 100
        : activeZone === 'great'
          ? 100
          : 0,
      status: 'great',
      tooltipLabel: 'a great',
    },
    {
      color: STATUS_COLORS.needsImprovement.bg,
      percentage: hasRatingsData
        ? (ratings.needsImprovement / totalRatings) * 100
        : activeZone === 'needsImprovement'
          ? 100
          : 0,
      status: 'needsImprovement',
      tooltipLabel: '"needs improvement" on',
    },
    {
      color: STATUS_COLORS.poor.bg,
      percentage: hasRatingsData
        ? (ratings.poor / totalRatings) * 100
        : activeZone === 'poor'
          ? 100
          : 0,
      status: 'poor',
      tooltipLabel: 'a poor',
    },
  ];

  // P75 is always at exactly 75%
  const p75Position = 75;

  const showTooltip = true;
  const showP75Label = variant === 'normal';

  // Get the color for the P75 marker based on active zone
  const markerColor =
    activeZone === 'great'
      ? STATUS_COLORS.great.bg
      : activeZone === 'needsImprovement'
        ? STATUS_COLORS.needsImprovement.bg
        : STATUS_COLORS.poor.bg;

  const visibleZones = zones.filter((zone) => zone.percentage > 0);
  const firstVisibleStatus = visibleZones[0]?.status;
  const lastVisibleStatus = visibleZones.at(-1)?.status;

  return (
    <div className="w-full">
      {/* Bar container */}
      <div className="relative w-full">
        {/* Zone segments */}
        <div className={barVariants({ variant })}>
          {zones.map((zone) => {
            const isActive = activeZone === zone.status;
            const isHovered = hoveredZone === zone.status;
            const isFirst = zone.status === firstVisibleStatus;
            const isLast = zone.status === lastVisibleStatus;

            if (zone.percentage === 0) {
              return null;
            }

            const bgColor =
              isActive || isHovered ? zone.color : getGreyShade(zone.status);

            const segmentClassName = `relative h-full ${isFirst ? 'rounded-l' : ''} ${isLast ? 'rounded-r' : ''} ${bgColor}`;
            const widthStyle = { width: `${zone.percentage}%` } as const;

            if (!showTooltip) {
              return (
                <span
                  className={segmentClassName}
                  key={zone.status}
                  onMouseEnter={() => setHoveredZone(zone.status)}
                  onMouseLeave={() => setHoveredZone(null)}
                  style={widthStyle}
                >
                  <div className="absolute -top-1 h-4 w-full" />
                </span>
              );
            }

            return (
              <Tooltip key={zone.status}>
                <TooltipTrigger asChild>
                  <span
                    className={segmentClassName}
                    onMouseEnter={() => setHoveredZone(zone.status)}
                    onMouseLeave={() => setHoveredZone(null)}
                    style={widthStyle}
                  >
                    {/* Larger hit area for hover */}
                    <div className="absolute -top-1 h-4 w-full" />
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {Math.round(zone.percentage)}% of visits had{' '}
                  {zone.tooltipLabel} {metricConfig.name}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        {/* P75 marker - vertical line extending above and below the bar */}
        <div
          className={`${markerVariants({ variant })} ${markerColor}`}
          style={{ left: `${p75Position}%` }}
        />
      </div>

      {showP75Label ? (
        <div className="relative h-8">
          <div
            className="absolute mt-2 flex w-0 flex-col items-center justify-center"
            style={{ left: `${p75Position}%` }}
          >
            <span className="flex cursor-default flex-col items-stretch justify-start rounded-sm border bg-background px-1.5 py-0.5">
              <p className="text-[12px] font-medium leading-4 text-muted-foreground">
                P75
              </p>
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

PercentileBarComponent.displayName = 'PercentileBar';
export const PercentileBar = memo(PercentileBarComponent);
