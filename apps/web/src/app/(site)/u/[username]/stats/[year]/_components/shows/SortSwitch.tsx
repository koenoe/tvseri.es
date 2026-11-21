import { HIT_Y } from '@/components/ui/button/hitArea';
import { Segmented, SegmentedItem } from '@/components/ui/button/Segmented';
import cn from '@/lib/cn';

import type { SortOrder } from './model';
import { SWITCH_ITEM, SWITCH_TRACK } from './switchLook';

const OPTIONS: ReadonlyArray<Readonly<{ label: string; value: SortOrder }>> = [
  { label: 'In order watched', value: 'watched' },
  { label: 'Most hours', value: 'hours' },
];

const TRACK = cn('flex', SWITCH_TRACK);

/** 32px pills, 44px to the thumb */
const ITEM = cn(SWITCH_ITEM, `px-3 py-1 text-body-sm ${HIT_Y[6]}`);

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
      className={TRACK}
      label="Order"
      onFocus={onIntent}
      onPointerDown={onIntent}
    >
      {OPTIONS.map((option) => {
        const choose = () => onChange(option.value);
        const pressed = option.value === value;
        return (
          <SegmentedItem
            className={ITEM}
            key={option.value}
            onClick={choose}
            pressed={pressed}
          >
            {option.label}
          </SegmentedItem>
        );
      })}
    </Segmented>
  );
}
