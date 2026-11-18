import type { LabelProps, YAxisTickContentProps } from 'recharts';

import { METRICS_CONFIG, type MetricType } from '@/lib/web-vitals';

import { BLUE_500 } from './constants';
import { formatValueForDisplay, getTickConfig } from './utils';

/** A y-axis label, with a dot at the great threshold and a triangle at the poor one. */
export function renderYAxisTick(
  metric: MetricType,
  { payload, x, y }: YAxisTickContentProps,
) {
  const value = payload.value as number;
  const tickX = Number(x);
  const tickY = Number(y);
  const { color, indicator } = getTickConfig(value, metric);
  const formattedValue =
    metric === 'res'
      ? value.toString()
      : `${formatValueForDisplay(metric, value)}${METRICS_CONFIG[metric].unit}`;

  const textX = tickX - 4;
  const indicatorX = textX + 6;
  const textStyle = { fill: color };
  const triangle = `M${indicatorX - 3} ${tickY + 3} L${indicatorX} ${tickY - 3} L${indicatorX + 3} ${tickY + 3} Z`;

  return (
    <g>
      <text
        dy={4}
        fontSize={12}
        style={textStyle}
        textAnchor="end"
        x={textX}
        y={tickY}
      >
        {formattedValue}
      </text>
      {indicator === 'dot' && (
        <circle cx={indicatorX} cy={tickY} fill={color} r={3} />
      )}
      {indicator === 'triangle' && <path d={triangle} fill={color} />}
    </g>
  );
}

/** Names a percentile's line at its last day with data. */
export function renderEndLabel(
  label: string,
  lastDataIndex: number,
  { index, x, y }: LabelProps,
) {
  if (index !== lastDataIndex) return <g />;
  const labelX = Number(x);
  const labelY = Number(y);
  return (
    <g>
      <circle cx={labelX} cy={labelY} fill={BLUE_500} r={4} />
      <text
        className="text-xs font-medium"
        dy={4}
        fill={BLUE_500}
        textAnchor="start"
        x={labelX + 8}
        y={labelY}
      >
        {label}
      </text>
    </g>
  );
}

type CursorProps = Readonly<{
  height?: number;
  points?: ReadonlyArray<Readonly<{ x: number }>>;
  top?: number;
}>;

/** Only the vertical line; the lines' active dots mark the values. */
export function CustomCursor({ height, points, top }: CursorProps) {
  const x = points?.[0]?.x;
  if (x === undefined) return null;

  const chartTop = top ?? 0;
  const chartBottom = chartTop + (height ?? 300);

  return (
    <line
      stroke="white"
      strokeWidth={1}
      x1={x}
      x2={x}
      y1={chartTop}
      y2={chartBottom}
    />
  );
}

CustomCursor.displayName = 'CustomCursor';
