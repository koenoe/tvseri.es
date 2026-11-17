import { memo } from 'react';

import { formatCountString } from '@/lib/api-metrics';

type RequestBarProps = Readonly<{
  maxRequestCount: number;
  requestCount: number;
}>;

function RequestBarComponent({
  maxRequestCount,
  requestCount,
}: RequestBarProps) {
  const percentage =
    maxRequestCount > 0 ? (requestCount / maxRequestCount) * 100 : 0;

  return (
    <div
      className="relative flex h-6 max-w-24 items-center rounded-sm bg-muted/80 px-1.5"
      style={{ minWidth: 'fit-content', width: `${percentage}%` }}
    >
      <span className="tabular-nums text-white/80">
        {formatCountString(requestCount)}
      </span>
    </div>
  );
}

RequestBarComponent.displayName = 'RequestBar';

export const RequestBar = memo(RequestBarComponent);
