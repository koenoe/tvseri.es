import { memo } from 'react';

import { eyeGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import cn from '@/lib/cn';
import type { PanelRow, PanelSegment } from './panelRows';
import styles from './seasonPanel.module.css';

const SEGMENT: Readonly<Record<PanelSegment['kind'], string>> = {
  '': 'bg-white/14',
  na: 'shadow-[inset_0_0_0_1px_rgb(255_0_128/0.5)]',
  nd: 'bg-white/45',
  nx: 'bg-cyan/60',
  w: 'bg-white',
};

const TONE = {
  default: 'text-white/60',
  done: 'text-white/80',
  pink: 'font-medium text-pink',
} as const;

/**
 * The dialog surface (`SURFACE.dialog`'s colour) as `--season-row`, so the
 * hover, active (4% toward white) and selected (9%) fills mix from one value.
 */
const ROW_SURFACE =
  '[--season-row:color-mix(in_srgb,var(--color-page)_75%,black)] bg-(--season-row) hover:bg-[color-mix(in_srgb,var(--season-row)_96%,white)]';

function RowSegment({ segment }: Readonly<{ segment: PanelSegment }>) {
  const style = { flex: segment.flex };
  const classes = cn('h-1 min-w-0.5 rounded-2', SEGMENT[segment.kind]);
  return <i className={classes} style={style} />;
}

/**
 * One season (78px): "Season 3" and its state on the
 * first line (eye + Watched · "4 of 10" · pink "E7 Fri" / "2027" · Not
 * started), "2024 · 10 episodes" under it, and the season's own 4px line
 * along the bottom. The whole row is one option (a button for the pointer;
 * the keyboard moves the select's active descendant); the selected one
 * sticks.
 */
const SeasonRow = memo(function SeasonRow({
  id,
  index,
  isActive,
  isSelected,
  onPick,
  padded,
  row,
}: Readonly<{
  id: string;
  index: number;
  isActive: boolean;
  isSelected: boolean;
  onPick: (seasonNumber: number) => void;
  padded: boolean;
  row: PanelRow;
}>) {
  const pick = () => onPick(row.seasonNumber);
  const classes = cn(
    'relative flex h-19.5 w-full flex-col justify-center rounded-12 py-2.5 text-left focus-visible:outline-offset-[-2px]',
    padded ? 'px-4' : 'px-3',
    ROW_SURFACE,
    isActive &&
      'bg-[color-mix(in_srgb,var(--season-row)_96%,white)] shadow-[inset_0_0_0_1.5px_rgb(255_255_255/0.4)]',
    isSelected &&
      'sticky inset-y-0 z-1 bg-[color-mix(in_srgb,var(--season-row)_91%,white)] hover:bg-[color-mix(in_srgb,var(--season-row)_91%,white)]',
    row.seasonNumber === 0 && styles.specials,
  );
  const state = cn(
    'inline-flex items-center gap-1.5 self-center whitespace-nowrap text-meta tabular-nums',
    TONE[row.state.tone],
  );
  const nameClass = cn(
    'whitespace-nowrap text-body-sm',
    isSelected ? 'font-semibold' : 'font-medium',
  );
  return (
    <button
      aria-label={row.aria}
      aria-selected={isSelected}
      className={classes}
      data-row={index}
      id={id}
      onClick={pick}
      role="option"
      tabIndex={-1}
      type="button"
    >
      <span className="flex min-w-0 items-baseline justify-between gap-4">
        <b className={nameClass}>{row.name}</b>
        <span className={state}>
          {row.state.tone === 'done' ? (
            <Icon active glyph={eyeGlyph} size={14} />
          ) : null}
          {row.state.text}
        </span>
      </span>
      <span className="mt-0.5 whitespace-nowrap text-meta text-white/60">
        {row.sub}
      </span>
      <span aria-hidden="true" className="mt-2 flex h-1 gap-0.5">
        {row.segments.map((segment, at) => (
          <RowSegment key={at} segment={segment} />
        ))}
      </span>
    </button>
  );
});
SeasonRow.displayName = 'SeasonRow';

export default SeasonRow;
