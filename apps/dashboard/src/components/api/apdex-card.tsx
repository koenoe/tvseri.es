import {
  ArrowUpRight,
  CircleAlert,
  CircleCheck,
  CircleMinus,
} from 'lucide-react';
import { memo } from 'react';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { getApdexStatusConfig } from '@/lib/api-metrics';
import { cn } from '@/lib/utils';
import {
  CardMenuButton,
  ChartSlot,
  MetricCard,
  MetricCardSkeleton,
  MetricValue,
} from './metric-card';

type ApdexCardProps = Readonly<{
  score: number;
}>;

const ROWS = 4;
const COLS = 8;
const TOTAL_CELLS = ROWS * COLS;

const STATUS_PALETTES = {
  frustrated: ['bg-red-500', 'bg-red-500/75', 'bg-red-500/50', 'bg-red-500/25'],
  satisfied: [
    'bg-green-500',
    'bg-green-500/75',
    'bg-green-500/50',
    'bg-green-500/25',
  ],
  tolerating: [
    'bg-amber-500',
    'bg-amber-500/75',
    'bg-amber-500/50',
    'bg-amber-500/25',
  ],
} as const;

const STATUS_ICONS = {
  frustrated: CircleAlert,
  satisfied: CircleCheck,
  tolerating: CircleMinus,
} as const;

const READABLE_THRESHOLDS = {
  frustrated: 'Below 0.50',
  satisfied: 'Above 0.85',
  tolerating: 'Between 0.50 and 0.85',
} as const;

const GRID_CLASSES = 'grid grid-cols-8 gap-1 w-full max-w-60 content-center';

function ApdexPopover({ score }: ApdexCardProps) {
  const statusConfig = getApdexStatusConfig(score);
  const StatusIcon = STATUS_ICONS[statusConfig.status];
  const readableThreshold = READABLE_THRESHOLDS[statusConfig.status];
  const iconClasses = cn('size-4', statusConfig.text);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <CardMenuButton />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-4">
        <div className="space-y-4">
          <p className="font-semibold">{statusConfig.label}</p>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <StatusIcon className={iconClasses} />
            {readableThreshold}
          </p>
          <hr className="border-border" />
          <p className="text-sm text-muted-foreground">
            Apdex (Application Performance Index) measures user satisfaction
            based on response times. Scores range from 0 to 1, where 1
            represents all users satisfied.
          </p>
          <a
            className="inline-flex items-center gap-1 text-blue-500 hover:text-blue-400 text-sm"
            href="https://en.wikipedia.org/wiki/Apdex"
            rel="noopener noreferrer"
            target="_blank"
          >
            Learn more about Apdex
            <ArrowUpRight className="size-3.5" />
          </a>
        </div>
      </PopoverContent>
    </Popover>
  );
}

ApdexPopover.displayName = 'ApdexPopover';

const ApdexCard = memo(function ApdexCard({ score }: ApdexCardProps) {
  const filledCells = Math.round(score * TOTAL_CELLS);
  const palette = STATUS_PALETTES[getApdexStatusConfig(score).status];
  const menu = <ApdexPopover score={score} />;

  return (
    <MetricCard
      action={menu}
      description="Application Performance Index"
      title="Apdex Score"
    >
      <MetricValue>{score.toFixed(2)}</MetricValue>
      <ChartSlot>
        <div className={GRID_CLASSES}>
          {Array.from({ length: TOTAL_CELLS }).map((_, index) => {
            const row = Math.floor(index / COLS);
            const colorClass = index < filledCells ? palette[row] : 'bg-muted';
            const cellClasses = cn(
              'aspect-4/1 w-full rounded-full',
              colorClass,
            );
            return <div className={cellClasses} key={index} />;
          })}
        </div>
      </ChartSlot>
    </MetricCard>
  );
});

ApdexCard.displayName = 'ApdexCard';

const SKELETON_CHART = (
  <div className={GRID_CLASSES}>
    {Array.from({ length: TOTAL_CELLS }).map((_, index) => (
      <div className="aspect-4/1 w-full rounded-full bg-muted" key={index} />
    ))}
  </div>
);

function ApdexCardSkeleton() {
  return (
    <MetricCardSkeleton
      chart={SKELETON_CHART}
      descriptionWidth="w-44"
      titleWidth="w-24"
      value="0.00"
    />
  );
}

ApdexCardSkeleton.displayName = 'ApdexCardSkeleton';

export { ApdexCard, ApdexCardSkeleton };
