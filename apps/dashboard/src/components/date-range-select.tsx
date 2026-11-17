import { useNavigate, useSearch } from '@tanstack/react-router';
import type { ChangeEvent } from 'react';
import { memo, useCallback } from 'react';

import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import { DAY_RANGES, type DaysValue, DEFAULT_DAYS } from '@/lib/search-params';

function DateRangeSelectComponent() {
  const navigate = useNavigate();
  const days = useSearch({
    select: (search) =>
      ((search as { days?: number }).days ?? DEFAULT_DAYS) as DaysValue,
    strict: false,
  });

  const handleDaysChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      navigate({
        search: (prev) => ({
          ...prev,
          days: Number(e.target.value) as DaysValue,
        }),
        to: '.',
      });
    },
    [navigate],
  );

  return (
    <NativeSelect
      className="[&_select]:h-7 [&_select]:text-xs [&_select]:px-3 [&_select]:pr-7 [&_svg]:right-2 [&_svg]:size-3"
      onChange={handleDaysChange}
      value={days}
    >
      {DAY_RANGES.map((range) => (
        <NativeSelectOption key={range} value={range}>
          {`Last ${range} days`}
        </NativeSelectOption>
      ))}
    </NativeSelect>
  );
}

DateRangeSelectComponent.displayName = 'DateRangeSelect';

export const DateRangeSelect = memo(DateRangeSelectComponent);
