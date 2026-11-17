import cn from '@/lib/cn';

export type SegmentedOption<T> = Readonly<{ label: string; value: T }>;

/**
 * A radio group of pills on one track: 3px padding, radius 10, the chosen
 * one `white/15`. `className` lays the track out (a row, a grid of equal
 * cells), `itemClassName` sizes the pills.
 */
export default function Segmented<T extends number | string>({
  className,
  itemClassName,
  label,
  onChange,
  options,
  value,
}: Readonly<{
  className: string;
  itemClassName: string;
  label: string;
  onChange: (value: T) => void;
  options: ReadonlyArray<SegmentedOption<T>>;
  value: T;
}>) {
  const track = cn('gap-0.5 rounded-10 bg-white/6 p-[3px]', className);
  return (
    <div aria-label={label} className={track} role="radiogroup">
      {options.map((option) => {
        const checked = option.value === value;
        const select = () => onChange(option.value);
        const itemClass = cn(
          'cursor-pointer whitespace-nowrap rounded-[7px] font-medium transition-colors duration-200',
          itemClassName,
          checked ? 'bg-white/15 text-white' : 'text-white/60',
        );
        return (
          <button
            aria-checked={checked}
            className={itemClass}
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
