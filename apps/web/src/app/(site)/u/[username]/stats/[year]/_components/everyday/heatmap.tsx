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
 * The heatmap: one rounded square per day, `col`
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
  const viewBox = `0 0 ${width} ${height}`;
  return (
    <svg
      aria-label={label}
      className={className}
      height={height}
      role="img"
      viewBox={viewBox}
      width={width}
    >
      {cells.map((cell) => {
        const cellId = `${cell.col}-${cell.row}`;
        const x = cell.col * pitch;
        const y = cell.row * pitch;
        return (
          <rect
            fill={STEP_FILLS[cell.step]}
            height={size}
            key={cellId}
            rx={radius}
            width={size}
            x={x}
            y={y}
          >
            <title>{cell.label}</title>
          </rect>
        );
      })}
    </svg>
  );
}
