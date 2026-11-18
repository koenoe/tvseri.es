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
 * A pill's slot is as wide as the widest pill (a glyph and "E03", 53px), so
 * pills with and without a glyph leave every label starting on one line;
 * the pills themselves stay exactly as the grid draws them.
 */
const ITEM =
  'grid grid-cols-[54px_auto] items-center gap-2 [&>:first-child]:justify-self-start';

function LegendItem({ item }: Readonly<{ item: Item }>) {
  const chipClass = markChipClass(
    item.state,
    undefined,
    'pointer-events-none h-6 min-w-11 px-[7px]',
  );
  const struck = item.state === 'sk';
  return (
    <span className={ITEM}>
      <span aria-hidden="true" className={chipClass}>
        {/* Next up is drawn as the cyan ring alone. */}
        {item.state === 'nx' ? null : <ChipGlyph state={item.state} />}
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
 * widest label so a badge never runs into the next column.
 */
export default function Legend() {
  return (
    <div className="grid grid-cols-[repeat(2,minmax(max-content,1fr))] gap-x-4 gap-y-2.5 rounded-14 bg-black/20 px-4 py-3.5 text-caption text-white/60">
      {ITEMS.map((item) => (
        <LegendItem item={item} key={item.chip} />
      ))}
    </div>
  );
}
