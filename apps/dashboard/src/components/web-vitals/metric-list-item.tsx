import type { LucideIcon } from 'lucide-react';
import { type KeyboardEvent, memo, useCallback } from 'react';

import { RouteLabel } from '@/components/route-label';
import { formatCountString } from '@/lib/api-metrics';
import { cn } from '@/lib/utils';
import { DataPointDots, getDotsCount } from './data-points';

const ROUTE_CLASSES = 'truncate max-w-56 text-sm py-0.5';
const ROUTE_DYNAMIC_CLASSES =
  'rounded bg-muted/50 p-0.5 font-mono text-xs text-muted-foreground inline-flex items-center';

type MetricListItemProps = Readonly<{
  /** Passed back to `onSelect`; the country code for countries. */
  id: string;
  isHighlighted?: boolean;
  label: string;
  onHover?: (label: string | null) => void;
  onSelect?: (id: string) => void;
  pageViews: number;
  statusColor?: string;
  StatusIcon?: LucideIcon;
  value: number | string;
  variant?: 'country' | 'route';
}>;

function MetricListItemComponent({
  id,
  isHighlighted,
  label,
  onHover,
  onSelect,
  pageViews,
  statusColor,
  StatusIcon,
  value,
  variant = 'route',
}: MetricListItemProps) {
  const isClickable = Boolean(onSelect);
  const dotsCount = getDotsCount(pageViews);

  const handleClick = useCallback(() => onSelect?.(id), [id, onSelect]);
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onSelect?.(id);
      }
    },
    [id, onSelect],
  );
  const handleMouseEnter = useCallback(
    () => onHover?.(label),
    [label, onHover],
  );
  const handleMouseLeave = useCallback(() => onHover?.(null), [onHover]);

  const rowClasses = cn(
    'flex items-center justify-center rounded-sm px-1 -mx-1 transition-colors duration-150',
    isHighlighted && 'bg-muted/50',
    isClickable && 'cursor-pointer hover:bg-muted/30',
  );
  const iconClasses = cn('size-4 shrink-0 ml-2', statusColor);

  return (
    <div
      className={rowClasses}
      onClick={isClickable ? handleClick : undefined}
      onKeyDown={isClickable ? handleKeyDown : undefined}
      onMouseEnter={onHover ? handleMouseEnter : undefined}
      onMouseLeave={onHover ? handleMouseLeave : undefined}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
    >
      <div className="flex gap-2.5 items-center justify-center">
        {variant === 'route' ? (
          <RouteLabel
            className={ROUTE_CLASSES}
            dynamicClassName={ROUTE_DYNAMIC_CLASSES}
            route={label}
          />
        ) : (
          <span className="truncate max-w-56 text-sm mr-1 py-0.5">{label}</span>
        )}
        <span className="text-xs flex items-center gap-0.5 mt-0.5 text-muted-foreground">
          {formatCountString(pageViews)}
          <DataPointDots count={dotsCount} />
        </span>
      </div>
      <span className="text-sm font-medium ml-auto">{value}</span>
      {StatusIcon ? <StatusIcon className={iconClasses} /> : null}
    </div>
  );
}

MetricListItemComponent.displayName = 'MetricListItem';
export const MetricListItem = memo(MetricListItemComponent);
