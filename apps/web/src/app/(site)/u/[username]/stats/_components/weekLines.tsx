import type { ReactElement } from 'react';

/**
 * The week lines (the header, the sidebar sparklines, the share
 * card): one rounded line per week, its height that week's episodes,
 * bottom-aligned. Pure: data in, `<svg>` out, attributes only (no classes, no
 * CSS), so the same drawing renders in a Server Component and in `next/og`.
 */

export const LINE_COLORS = {
  /** The busiest week */
  busiest: '#ffffff',
  /** This week, in a year in progress */
  current: '#00ffff',
  /** A week still to come: a faint stub */
  future: 'rgba(255,255,255,0.08)',
  /** A week like any other */
  week: 'rgba(255,255,255,0.2)',
} as const;

export type WeekLine = Readonly<{
  /** Centre of the line, as a fraction (0 to 1) of the width */
  at: number;
  height: number;
  color: string;
}>;

type LayoutInput = Readonly<{
  /** Episodes per visual week (53) */
  values: ReadonlyArray<number>;
  /** Drawing height in px; the busiest week fills it */
  height: number;
  /** The week in progress (cyan); later weeks are stubs. Omit for a past year */
  currentWeek?: number;
  /** Stub height for future and empty weeks */
  stub?: number;
  /** Stub height for weeks still to come (3px; empty past weeks 2px). Defaults to `stub` */
  futureStub?: number;
  /** Colour of an ordinary week (sparklines may be dimmer) */
  weekColor?: string;
  /** Colour of a week with nothing watched (the share card's is brighter) */
  emptyColor?: string;
}>;

/**
 * Where each line sits and how tall it is. Lines share the width equally
 * (`flex: 1` slots), so a line's centre is `(i + .5) / n`.
 */
export function weekLinesLayout({
  values,
  height,
  currentWeek,
  stub = 2,
  futureStub = stub,
  weekColor = LINE_COLORS.week,
  emptyColor = LINE_COLORS.future,
}: LayoutInput): ReadonlyArray<WeekLine> {
  const counted =
    currentWeek === undefined ? values : values.slice(0, currentWeek + 1);
  const max = Math.max(0, ...counted);
  const busiest = max > 0 ? counted.indexOf(max) : -1;
  return values.map((value, index) => {
    const at = (index + 0.5) / values.length;
    if (currentWeek !== undefined && index > currentWeek) {
      return { at, color: LINE_COLORS.future, height: futureStub };
    }
    const color =
      index === currentWeek
        ? LINE_COLORS.current
        : index === busiest
          ? LINE_COLORS.busiest
          : value === 0
            ? emptyColor
            : weekColor;
    const scaled = max > 0 ? Math.round((value / max) * height) : 0;
    return { at, color, height: Math.max(stub, scaled) };
  });
}

type SvgInput = LayoutInput &
  Readonly<{
    /** Line width in px */
    lineWidth: number;
    /**
     * Drawing width in px. Omit to fill the parent (`width="100%"`, lines at
     * percentages): the page's fluid header. `next/og` needs a number.
     */
    width?: number;
    /**
     * Px between the lines' slots (like a flex `gap`: 13 on the
     * header, 4 on the phone). Slots share what's left equally.
     */
    gap?: number;
    label?: string;
    /** A class on every line and the delay between their starts, in ms (for a CSS grow) */
    lineClass?: string;
    stagger?: number;
  }>;

/** The week lines as an `<svg>` (see `weekLinesLayout`) */
export function weekLinesSvg(input: SvgInput): ReactElement {
  const {
    gap = 0,
    height,
    label,
    lineClass,
    lineWidth,
    stagger = 0,
    width,
  } = input;
  const lines = weekLinesLayout(input);
  const count = lines.length;
  // A slot's centre moves by this many px from its share of the width
  const shift = (index: number) => (gap * (index - (count - 1) / 2)) / count;
  const radius = lineWidth / 2;
  const rect = (line: WeekLine, x: number, index: number) => {
    const growStyle = lineClass
      ? { animationDelay: `${index * stagger}ms` }
      : undefined;
    const y = height - line.height;
    return (
      <rect
        className={lineClass}
        fill={line.color}
        height={line.height}
        rx={radius}
        style={growStyle}
        width={lineWidth}
        x={x}
        y={y}
      />
    );
  };
  const viewBox = width === undefined ? undefined : `0 0 ${width} ${height}`;
  const svgWidth = width ?? '100%';
  return (
    <svg
      aria-hidden={label ? undefined : true}
      aria-label={label}
      height={height}
      role={label ? 'img' : undefined}
      viewBox={viewBox}
      width={svgWidth}
      xmlns="http://www.w3.org/2000/svg"
    >
      {lines.map((line, index) => {
        const percentX = `${(line.at * 100).toFixed(3)}%`;
        return width === undefined ? (
          // A fluid width: each line in its own box at a percentage
          <svg key={index} overflow="visible" x={percentX}>
            {rect(line, shift(index) - lineWidth / 2, index)}
          </svg>
        ) : (
          <g key={index}>
            {rect(line, line.at * width + shift(index) - lineWidth / 2, index)}
          </g>
        );
      })}
    </svg>
  );
}
