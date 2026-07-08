import { useCallback } from 'react';

import { PERCENTILES, type PercentileKey } from './constants';

type PercentileToggleProps = Readonly<{
  activePercentiles: Set<PercentileKey>;
  onToggle: (key: PercentileKey) => void;
}>;

export function PercentileToggle({
  activePercentiles,
  onToggle,
}: PercentileToggleProps) {
  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      onToggle(event.currentTarget.dataset.key as PercentileKey);
    },
    [onToggle],
  );

  return (
    <div className="flex items-center gap-4">
      {PERCENTILES.map(({ key, label }) => {
        const isActive = activePercentiles.has(key);
        return (
          <button
            className={`flex cursor-pointer items-center gap-1.5 text-sm transition-opacity ${
              isActive
                ? 'text-blue-500'
                : 'text-muted-foreground opacity-40 hover:opacity-60'
            }`}
            data-key={key}
            key={key}
            onClick={handleClick}
            type="button"
          >
            <span
              className={`size-2.5 rounded-full ${
                isActive ? 'bg-blue-500' : 'border border-current'
              }`}
            />
            {label}
          </button>
        );
      })}
    </div>
  );
}

PercentileToggle.displayName = 'PercentileToggle';
