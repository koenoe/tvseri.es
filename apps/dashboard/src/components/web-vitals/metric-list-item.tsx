import type { LucideIcon } from 'lucide-react';
import { memo } from 'react';
import { formatCountString } from '@/lib/api-metrics';

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
  label: string;
  pageViews: number;
  statusColor?: string;
  StatusIcon?: LucideIcon;
  value: number | string;
  variant?: 'country' | 'route';
}>;

function MetricListItemComponent({
  label,
  pageViews,
  statusColor,
  StatusIcon,
  value,
  variant = 'route',
}: MetricListItemProps) {
  const isRoute = variant === 'route';
  const formattedPageViews = formatCountString(pageViews);

  return (
    <div className="flex items-center justify-center">
      <div className="flex gap-2.5 items-center justify-center">
        {isRoute ? (
          <RouteLabel route={label} />
        ) : (
          <span className="truncate max-w-56 text-sm mr-1 py-0.5">{label}</span>
        )}
        <span className="text-muted-foreground text-xs flex items-center mt-0.5">
          {formattedPageViews}
          <svg
            className="size-4"
            fill="currentColor"
            height="16"
            strokeLinejoin="round"
            viewBox="0 0 16 16"
            width="16"
          >
            <path
              clipRule="evenodd"
              d="M7.5 5.25C7.5 6.2165 6.7165 7 5.75 7C4.7835 7 4 6.2165 4 5.25C4 4.2835 4.7835 3.5 5.75 3.5C6.7165 3.5 7.5 4.2835 7.5 5.25ZM7.5 10.75C7.5 11.7165 6.7165 12.5 5.75 12.5C4.7835 12.5 4 11.7165 4 10.75C4 9.7835 4.7835 9 5.75 9C6.7165 9 7.5 9.7835 7.5 10.75ZM10.25 9.75C11.2165 9.75 12 8.9665 12 8C12 7.0335 11.2165 6.25 10.25 6.25C9.2835 6.25 8.5 7.0335 8.5 8C8.5 8.9665 9.2835 9.75 10.25 9.75Z"
              fill="currentColor"
              fillRule="evenodd"
            />
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
