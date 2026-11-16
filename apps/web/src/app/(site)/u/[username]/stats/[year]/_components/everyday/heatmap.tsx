import type { ReactElement } from 'react';

import { type HeatCell, STEP_FILLS } from './model';

type Props = Readonly<{
  cells: ReadonlyArray<HeatCell>;
  columns: number;
  rows: number;
  /** Cell edge in px */
  size: number;
  /** Gap between cells in px */
  gap: number;
  /** Corner radius in px */
  radius?: number;
  /** The drawing's accessible name */
  label: string;
  /** Styling hook for the page (hover); the drawing itself needs none */
  className?: string;
}>;

/**
 * The heatmap (`.st-hmgrid`, `.st-mm`): one rounded square per day, `col`
 * across and `row` down, filled by its step, with the day's tooltip as the
 * square's `<title>`. Blank days have no square. Pure: data in, `<svg>` out,
 * attributes only (no classes needed, no CSS), so it also renders in
 * `next/og`.
 */
export function heatmapSvg({
  cells,
  className,
  columns,
  gap,
  label,
  radius = 3,
  rows,
  size,
}: Props): ReactElement {
  const pitch = size + gap;
  const width = columns * pitch - gap;
  const height = rows * pitch - gap;
  return (
    <svg
      aria-label={label}
      className={className}
      height={height}
      role="img"
      viewBox={`0 0 ${width} ${height}`}
      width={width}
    >
      {cells.map((cell) => (
        <rect
          fill={STEP_FILLS[cell.step]}
          height={size}
          key={`${cell.col}-${cell.row}`}
          rx={radius}
          width={size}
          x={cell.col * pitch}
          y={cell.row * pitch}
        >
          <title>{cell.label}</title>
        </rect>
      ))}
    </svg>
  );
}
