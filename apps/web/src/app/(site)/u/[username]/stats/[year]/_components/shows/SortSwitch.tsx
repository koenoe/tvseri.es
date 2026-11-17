import type { SortOrder } from './model';
import Segmented, { type SegmentedOption } from './Segmented';

const OPTIONS: ReadonlyArray<SegmentedOption<SortOrder>> = [
  { label: 'In order watched', value: 'watched' },
  { label: 'Most hours', value: 'hours' },
];

/** "In order watched / Most hours" */
export default function SortSwitch({
  onChange,
  onIntent,
  value,
}: Readonly<{
  onChange: (value: SortOrder) => void;
  onIntent: () => void;
  value: SortOrder;
}>) {
  return (
    <Segmented
      className="flex"
      itemClassName="px-3 py-1 text-body-sm"
      label="Order"
      onChange={onChange}
      onIntent={onIntent}
      options={OPTIONS}
      value={value}
    />
  );
}
