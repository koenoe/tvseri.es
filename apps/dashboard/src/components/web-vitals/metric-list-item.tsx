import type { LucideIcon } from 'lucide-react';
import { memo } from 'react';
import { formatCountString } from '@/lib/api-metrics';

function getDotsCount(pageViews: number) {
  // > 100 = 3 dots, 50-100 = 2 dots, < 50 = 1 dot
  if (pageViews > 100) return 3;
  if (pageViews >= 50) return 2;
  return 1;
}

/**
 * Renders a route path with dynamic segments styled differently.
 * Dynamic segments like [id], [slug], :id, or * get mono font + muted bg.
 * Static segments get normal white text.
 */
function RouteLabel({ route }: Readonly<{ route: string }>) {
  // Match dynamic segments: [param], :param, or *
  const parts = route.split(/(\[[^\]]+\]|:[^/]+|\*)/g).filter(Boolean);

  return (
    <span className="truncate max-w-56 text-sm py-0.5">
      {parts.map((part, index) => {
        const isDynamic =
          part.startsWith('[') || part.startsWith(':') || part === '*';
        return isDynamic ? (
          <span
            className="rounded bg-muted/50 p-0.5 font-mono text-xs text-muted-foreground inline-flex items-center"
            key={index}
          >
            {part}
          </span>
        ) : (
          <span key={index}>{part}</span>
        );
      })}
    </span>
  );
}
RouteLabel.displayName = 'RouteLabel';

type MetricListItemProps = Readonly<{
  isHighlighted?: boolean;
  label: string;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  pageViews: number;
  statusColor?: string;
  StatusIcon?: LucideIcon;
  value: number | string;
  variant?: 'country' | 'route';
}>;

function MetricListItemComponent({
  isHighlighted,
  label,
  onMouseEnter,
  onMouseLeave,
  pageViews,
  statusColor,
  StatusIcon,
  value,
  variant = 'route',
}: MetricListItemProps) {
  const isRoute = variant === 'route';
  const formattedPageViews = formatCountString(pageViews);
  const dotsCount = getDotsCount(pageViews);

  return (
    <div
      className={`flex items-center justify-center rounded-sm px-1 -mx-1 transition-colors duration-150 ${isHighlighted ? 'bg-muted/50' : ''}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="flex gap-2.5 items-center justify-center">
        {isRoute ? (
          <RouteLabel route={label} />
        ) : (
          <span className="truncate max-w-56 text-sm mr-1 py-0.5">{label}</span>
        )}
        <span className="text-xs flex items-center gap-0.5 mt-0.5 text-muted-foreground">
          {formattedPageViews}
          <svg className="size-4" fill="currentColor" viewBox="0 0 16 16">
            {dotsCount >= 1 && <circle cx="10" cy="8" r="2" />}
            {dotsCount >= 2 && <circle cx="5" cy="11" r="2" />}
            {dotsCount >= 3 && <circle cx="5" cy="5" r="2" />}
          </svg>
        </span>
      </div>
      <span className="text-sm font-medium ml-auto">{value}</span>
      {StatusIcon && (
        <StatusIcon className={`size-4 shrink-0 ml-2 ${statusColor ?? ''}`} />
      )}
    </div>
  );
}

MetricListItemComponent.displayName = 'MetricListItem';
export const MetricListItem = memo(MetricListItemComponent);
