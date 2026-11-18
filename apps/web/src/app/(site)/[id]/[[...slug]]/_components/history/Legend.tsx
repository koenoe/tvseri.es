import Badge from '@/components/ui/button/Badge';

import type { ChipState } from './chips';
import { ChipGlyph, ChipText, markChipClass } from './MarkChip';

type Item = Readonly<{
  state: ChipState;
  chip: string;
  label: string;
  isNew: boolean;
}>;

const ITEMS: ReadonlyArray<Item> = [
  { chip: 'E04', isNew: false, label: 'Not watched', state: '' },
  { chip: 'E01', isNew: false, label: 'Watched', state: 'w' },
  {
    chip: 'E03',
    isNew: true,
    label: 'Watched · don’t remember when',
    state: 'nd',
  },
  { chip: 'E05', isNew: false, label: 'Next up', state: 'nx' },
  { chip: 'E06', isNew: true, label: 'Skipped', state: 'sk' },
];

/**
 * Every pill fills one slot (a glyph and "E03"), as the grid's chips fill
 * their equal columns: one pill size, and every label starts on one line.
 */
const ITEM = 'grid grid-cols-[54px_auto] items-center gap-2';

function LegendItem({ item }: Readonly<{ item: Item }>) {
  const chipClass = markChipClass(
    item.state,
    undefined,
    'pointer-events-none h-6 w-full px-[7px]',
  );
  const struck = item.state === 'sk';
  return (
    <span className={ITEM}>
      <span aria-hidden="true" className={chipClass}>
        <ChipGlyph state={item.state} />
        <ChipText struck={struck}>{item.chip}</ChipText>
      </span>
      <span className="inline-flex items-center gap-2 whitespace-nowrap">
        {item.label}
        {item.isNew ? <Badge>New</Badge> : null}
      </span>
    </span>
  );
}

/**
 * The legend: each chip state with its name;
 * "don't remember when" and Skipped carry the New badge. Columns fit their
 * widest label so a badge never runs into the next column; phones take one
 * column, as two don't fit.
 */
export default function Legend() {
  return (
    <div className="grid grid-cols-[repeat(2,minmax(max-content,1fr))] gap-x-4 max-sm:grid-cols-1 gap-y-2.5 rounded-14 bg-black/20 px-4 py-3.5 text-caption text-white/60">
      {ITEMS.map((item) => (
        <LegendItem item={item} key={item.chip} />
      ))}
    </div>
  );
}
