import cn from '@/lib/cn';

import type { SortOrder } from './model';

const OPTIONS: ReadonlyArray<Readonly<{ label: string; value: SortOrder }>> = [
  { label: 'In order watched', value: 'watched' },
  { label: 'Most hours', value: 'hours' },
];

/**
 * "In order watched / Most hours": a radio group of two,
 * 3px padding, radius 10; the chosen one `white/15`.
 */
export default function SortSwitch({
  onChange,
  value,
}: Readonly<{
  onChange: (value: SortOrder) => void;
  value: SortOrder;
}>) {
  return (
    <div
      aria-label="Order"
      className="flex gap-0.5 rounded-10 bg-white/6 p-[3px]"
      role="radiogroup"
    >
      {OPTIONS.map((option) => {
        const checked = option.value === value;
        const select = () => onChange(option.value);
        return (
          <button
            aria-checked={checked}
            className={cn(
              'cursor-pointer whitespace-nowrap rounded-[7px] px-3 py-1 font-medium text-body-sm transition-colors duration-200',
              checked ? 'bg-white/15 text-white' : 'text-white/60',
            )}
            key={option.value}
            onClick={select}
            role="radio"
            type="button"
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
