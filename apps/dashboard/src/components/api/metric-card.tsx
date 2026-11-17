import { MoreVertical } from 'lucide-react';
import { type ComponentProps, type ReactNode, useId } from 'react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const MENU_TRIGGER_CLASSES =
  'text-muted-foreground cursor-pointer data-[state=open]:bg-input/50';
const CONTENT_CLASSES =
  '@container flex items-center justify-between gap-6 lg:gap-10';
const VALUE_CLASSES =
  'text-[clamp(2.5rem,12cqw,4rem)] leading-none font-bold text-foreground shrink-0';
const CHART_SLOT_CLASSES = 'flex-1 h-14 min-w-0 flex justify-end';

/** The ⋮ button that opens a card's popover; Radix triggers pass their props through. */
export function CardMenuButton({
  className = MENU_TRIGGER_CLASSES,
  ...props
}: ComponentProps<typeof Button>) {
  return (
    <Button
      aria-label="Details"
      className={className}
      size="icon-sm"
      variant="ghost"
      {...props}
    >
      <MoreVertical className="size-4" />
    </Button>
  );
}

CardMenuButton.displayName = 'CardMenuButton';

/** The ⋮ button of a card with nothing to show. */
export function DisabledCardMenuButton({
  size = 'icon-sm',
}: Readonly<{ size?: 'icon-sm' | 'icon-xs' }>) {
  return (
    <Button
      aria-label="Details"
      className="text-muted-foreground"
      disabled
      size={size}
      variant="ghost"
    >
      <MoreVertical className="size-4" />
    </Button>
  );
}

DisabledCardMenuButton.displayName = 'DisabledCardMenuButton';

type MetricCardProps = Readonly<{
  action: ReactNode;
  children: ReactNode;
  description: ReactNode;
  title: string;
}>;

export function MetricCard({
  action,
  children,
  description,
  title,
}: MetricCardProps) {
  return (
    <Card className="w-full border">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        <CardAction>{action}</CardAction>
      </CardHeader>
      <CardContent className={CONTENT_CLASSES}>{children}</CardContent>
    </Card>
  );
}

MetricCard.displayName = 'MetricCard';

export function MetricValue({
  children,
  className,
  unit,
}: Readonly<{ children: ReactNode; className?: string; unit?: string }>) {
  const classes = cn(VALUE_CLASSES, className);
  return (
    <div className={classes}>
      {children}
      {unit ? (
        <span className="text-[0.4em] font-light ml-1 text-muted-foreground/60">
          {unit}
        </span>
      ) : null}
    </div>
  );
}

MetricValue.displayName = 'MetricValue';

export function ChartSlot({
  children,
  className,
}: Readonly<{ children: ReactNode; className?: string }>) {
  const classes = cn(CHART_SLOT_CLASSES, className);
  return <div className={classes}>{children}</div>;
}

ChartSlot.displayName = 'ChartSlot';

type AreaSparklineProps = Readonly<{
  areaPath: string;
  color: string;
  linePath: string;
  strokeLinecap?: 'round' | 'square';
  strokeLinejoin?: 'miter' | 'round';
}>;

/** A line over a fading fill, stretched to the card's chart slot. */
export function AreaSparkline({
  areaPath,
  color,
  linePath,
  strokeLinecap = 'round',
  strokeLinejoin = 'round',
}: AreaSparklineProps) {
  const gradientId = useId();
  const fill = `url(#${gradientId})`;
  return (
    <div className="h-full w-full max-w-60 relative">
      <svg
        aria-hidden="true"
        className="w-full h-full overflow-visible"
        preserveAspectRatio="none"
        viewBox="0 0 200 100"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={fill} />
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeLinecap={strokeLinecap}
          strokeLinejoin={strokeLinejoin}
          strokeWidth="2"
        />
      </svg>
    </div>
  );
}

AreaSparkline.displayName = 'AreaSparkline';

type MetricCardSkeletonProps = Readonly<{
  chart: ReactNode;
  chartSlotClassName?: string;
  descriptionWidth: string;
  menuSize: 'icon-sm' | 'icon-xs';
  titleWidth: string;
  /** Invisible text that gives the value its loaded width. */
  value: ReactNode;
}>;

export function MetricCardSkeleton({
  chart,
  chartSlotClassName,
  descriptionWidth,
  menuSize,
  titleWidth,
  value,
}: MetricCardSkeletonProps) {
  const titleClasses = cn('h-4 rounded-none bg-white/40', titleWidth);
  const descriptionClasses = cn('h-3.5 rounded-none', descriptionWidth);
  return (
    <Card className="w-full border">
      <CardHeader>
        <Skeleton className={titleClasses} />
        <Skeleton className={descriptionClasses} />
        <CardAction>
          <DisabledCardMenuButton size={menuSize} />
        </CardAction>
      </CardHeader>
      <CardContent className={CONTENT_CLASSES}>
        <Skeleton className="text-[clamp(2.5rem,12cqw,4rem)] leading-none font-bold shrink-0 rounded-none bg-white/40">
          <span className="invisible">{value}</span>
        </Skeleton>
        <ChartSlot className={chartSlotClassName}>{chart}</ChartSlot>
      </CardContent>
    </Card>
  );
}

MetricCardSkeleton.displayName = 'MetricCardSkeleton';
