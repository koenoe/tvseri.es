import { X } from 'lucide-react';
import { useCallback } from 'react';

import { getCountryDisplayName } from '@/lib/utils';

import type { PercentileKey } from './constants';
import { PercentileToggle } from './percentile-toggle';

type ChartToolbarProps = Readonly<{
  activePercentiles: Set<PercentileKey>;
  country: string | undefined;
  onClearCountry: () => void;
  onPercentilesChange: (percentiles: Set<PercentileKey>) => void;
}>;

/** The active country filter (click to clear) and the percentile switches. */
export function ChartToolbar({
  activePercentiles,
  country,
  onClearCountry,
  onPercentilesChange,
}: ChartToolbarProps) {
  const handleToggle = useCallback(
    (key: PercentileKey) => {
      const next = new Set(activePercentiles);
      if (next.has(key)) {
        // At least one percentile stays visible.
        if (next.size > 1) {
          next.delete(key);
        }
      } else {
        next.add(key);
      }
      onPercentilesChange(next);
    },
    [activePercentiles, onPercentilesChange],
  );

  const countryName = country ? getCountryDisplayName(country) : null;
  const clearLabel = `Clear the ${countryName} filter`;

  return (
    <div className="mb-4 flex items-center justify-end gap-6">
      {countryName ? (
        <button
          aria-label={clearLabel}
          className="flex cursor-pointer items-center gap-1 rounded-2xl border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted/50"
          onClick={onClearCountry}
          type="button"
        >
          {countryName}
          <X className="size-3" />
        </button>
      ) : null}
      <PercentileToggle
        activePercentiles={activePercentiles}
        onToggle={handleToggle}
      />
    </div>
  );
}

ChartToolbar.displayName = 'ChartToolbar';
