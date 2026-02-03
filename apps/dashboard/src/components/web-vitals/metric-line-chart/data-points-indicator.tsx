import { formatCountString } from '@/lib/api-metrics';

type DataPointsIndicatorProps = Readonly<{
  pageviews: number;
}>;

export function DataPointsIndicator({ pageviews }: DataPointsIndicatorProps) {
  const config =
    pageviews > 100
      ? { color: 'text-green-500', dots: 3 }
      : pageviews >= 50
        ? { color: 'text-amber-500', dots: 2 }
        : { color: 'text-red-500', dots: 1 };

  return (
    <span className={`flex items-center gap-0.5 ${config.color}`}>
      {formatCountString(pageviews)}
      <svg className="size-4" fill="currentColor" viewBox="0 0 16 16">
        {config.dots >= 1 && <circle cx="10" cy="8" r="2" />}
        {config.dots >= 2 && <circle cx="5" cy="11" r="2" />}
        {config.dots >= 3 && <circle cx="5" cy="5" r="2" />}
      </svg>
    </span>
  );
}

DataPointsIndicator.displayName = 'DataPointsIndicator';
