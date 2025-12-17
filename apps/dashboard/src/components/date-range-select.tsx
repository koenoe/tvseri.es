import { useNavigate, useSearch } from '@tanstack/react-router';
import type { ChangeEvent } from 'react';
import { memo } from 'react';

import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';

const DATE_RANGE_OPTIONS = [
  { label: 'Last 7 days', value: 7 },
  { label: 'Last 30 days', value: 30 },
] as const;

type DaysValue = 7 | 30;

function DateRangeSelectComponent() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { days?: number };
  const days = (search.days ?? 7) as DaysValue;

  const handleDaysChange = (e: ChangeEvent<HTMLSelectElement>) => {
    navigate({
      search: (prev) => ({
        ...prev,
        days: Number(e.target.value) as DaysValue,
      }),
      to: '.',
    });
  };

  return (
    <NativeSelect
      className="[&_select]:h-7 [&_select]:text-xs [&_select]:px-3 [&_select]:pr-7 [&_svg]:right-2 [&_svg]:size-3"
      onChange={handleDaysChange}
      value={days}
    >
      {DATE_RANGE_OPTIONS.map((option) => (
        <NativeSelectOption key={option.value} value={option.value}>
          {option.label}
        </NativeSelectOption>
      ))}
    </NativeSelect>
  );
}

DateRangeSelectComponent.displayName = 'DateRangeSelect';

export const DateRangeSelect = memo(DateRangeSelectComponent);
